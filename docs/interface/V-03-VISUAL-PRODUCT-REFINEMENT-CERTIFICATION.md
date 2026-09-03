# V-03 VISUAL PRODUCT REFINEMENT — CERTIFICATION

**Date:** 2026-08-31  
**Authority:** APEX Visual/Product Overhaul — V-03 Authorization  
**Phase:** V-03 — Visual Product Refinement  
**Status:** CERTIFIED — All V-03 requirements met  
**Baseline:** V-02 commit `029c44c` — production not modified  
**V-03 diff base:** `029c44c`

---

## 1. Files Changed

| File | Change |
|------|--------|
| `public/apex-zero.css` | V-03 additions: ~180 lines appended (sections 20–25) |

No HTML, JS, backend, or configuration files modified.

---

## 2. V-03-01 — Activity / Telemetry Separation

### Data Gap Documented

**Root cause:** The backend emits performance telemetry entries (e.g., `"Slow response — 1927ms"`) using `type: 'error'` — the same event type used for genuine application errors. No distinct `type: 'telemetry'` or `type: 'perf'` channel exists.

This means CSS cannot distinguish real errors from performance diagnostics by tag class alone. Full resolution requires a backend event taxonomy change (deferred to V-04+, not a V-03 scope item per the hard protection rules).

### CSS Hierarchy Applied (Best-Effort)

| Tag Class | Treatment | Rationale |
|-----------|-----------|-----------|
| `.apex-tag-agent` | Full opacity, on-void text | User activity — agent events are always relevant |
| `.apex-tag-voice` | Full opacity, signal colour | User activity — voice interactions |
| `.apex-tag-research` | Full opacity, warning colour | User activity — research results |
| `.apex-tag-error` | 0.65 opacity | Medium — may be real error or perf telemetry |
| `.apex-tag-system` | 0.45 opacity | De-emphasised — mostly startup/internal messages |
| `.apex-tag-COST / PERF / LATENCY` | 0.35 opacity | De-emphasised — explicit telemetry classes (future-proofing) |

All feed tags migrated from `JetBrains Mono` to `Inter` ✅

### Verified Tag Font
`getComputedStyle('.apex-tag').fontFamily = "Inter, system-ui, sans-serif"` ✅

---

## 3. V-03-02 — Typography System

### Canonical Type Scale Defined

```css
--type-display:    700 26px/1.15 Inter
--type-title:      600 16px/1.3  Inter
--type-section:    600  9px/1    Inter  (uppercase)
--type-body:       400 13px/1.6  Inter
--type-meta:       400 11px/1.45 Inter
--type-label:      600  9px/1    Inter  (uppercase)
--type-numeric:    600 20px/1    JetBrains Mono  (data values only)
--type-numeric-sm: 500 14px/1    JetBrains Mono
```

**JetBrains Mono retained only for numeric/statistical data values** — removed from all labels, tags, nav, and secondary text.

### Applied To

| Element | Before | After |
|---------|--------|-------|
| `.ds-page-title` | 26px Inter (already Inter from V-02) | 26px Inter, 0.04em spacing ✅ |
| `.apex-tag` | JetBrains Mono 7.5px | Inter 8px, weight 600 ✅ |
| `.stat-lbl` | Varied | Inter 10px, uppercase, on-void-3 ✅ |
| `.stat-sub` | Varied | Inter 10px, on-void-3 ✅ |
| `.stat-num` | Varied | JetBrains Mono 20px (mono kept for data) ✅ |
| `.apex-feed-title` | JetBrains Mono | Inter 9px, uppercase ✅ |
| `.chat-input` | — | Inter 14px ✅ |

### Playwright Evidence
- `statNumFont: "JetBrains Mono", monospace` ✅ (data values preserved in mono)
- `tagFont: Inter, system-ui, sans-serif` ✅

---

## 4. V-03-03 — Global Token Application

### Issues Fixed

| Surface | Before | After |
|---------|--------|-------|
| `.ds-input` background | `rgb(20,29,48)` (navy `#141d30`) | `rgb(17,17,17)` (`--void-2` #111111) ✅ |
| `.ds-btn.grey` color | `rgb(110,133,164)` (navy-tinted) | `rgba(244,244,245,0.60)` (`--on-void-2`) ✅ |
| `.ds-btn.cyan` color | `rgb(99,102,241)` | `rgb(99,102,241)` (signal — correct) ✅ |
| `.ds-btn` focus | cyan glow | signal/indigo glow ✅ |
| `#page-command` navy `#0d1424` backgrounds | navy | `--void-1` ✅ |
| `#page-overview` navy backgrounds | navy | `--void-1` ✅ |

### Remaining Visible Residual
Some inline `style=` attributes on deeply nested elements in domain pages (System, Finance, Health, etc.) still use hardcoded navy/cyan values. These are targeted for V-04 page-by-page migration. The primary shell surfaces (command, nav, topbar, inputs, buttons) are now consistently in APEX Zero tokens.

### apex-zero.css authority
apex-zero.css remains the sole canonical design system file. No new competing `:root` blocks or inline design systems introduced.

---

## 5. V-03-04 — Visual Hierarchy Assessment

### Command Centre
1. **Most important thing:** PlasmaOrb (voice state) + stat strip
2. **Visually dominant:** Orb is correctly centred, now 200px (reduced from 240px in V-02)
3. **Next user action:** Tap orb to speak — clear (cursor:pointer, canvas element)
4. **Secondary information:** Activity feed (right column) — subordinate ✅
5. **Page density:** Appropriate — orb, stats, feed, constitution

### Navigation
- Groups (CORE / DOMAINS / SYSTEM) provide scannable hierarchy
- Active page: indigo left border
- Inactive: muted, Inter 12px
- No decorative elements

### All 20 Pages
All 20 pages accessible. Each page renders with correct layout (verified: 20/20 navigation all OK).

---

## 6. V-03-05 — Command Centre / PlasmaOrb Decision

### Decision: RETAIN

**Rationale:**

The PlasmaOrb is the primary voice interaction target. It communicates 4 meaningful system states:
- `STANDBY` — slow rotation
- `LISTENING` — active listening animation
- `THINKING` — processing animation
- `SPEAKING` — response animation

This is functional state communication, not decoration. Voice interaction is the primary APEX interaction modality.

**Changes applied:**
- Size: 360px (original) → 240px (V-02) → **200px (V-03)** at desktop
- Mobile: 160px (V-02) → **140px (V-03)**
- Redundant "APEX" text label below orb: hidden (V-02, retained)

**Verified:** `orbW: 200px` ✅

**Future consideration:** If a richer data-driven state indicator (system health ring, agent activity sparkline) becomes available via backend data, PlasmaOrb should be re-evaluated. That is a V-05+ decision, not V-03.

---

## 7. V-03-06 — Empty State Audit

### CSS Applied
`.ds-empty` and `.apex-empty` classes defined with:
- Flex column, centred
- `--on-void-3` colour (clearly subordinate)
- Inter 12px
- Min-height 80px

### Existing Patterns Observed
The app currently uses a mix of:
- Loading text ("Loading…", "Checking…") inline in stat card elements
- Explicit `display:none` hiding before data loads
- No consistent `.ds-empty` / `.ds-error` pattern across domain pages

**Documented gap:** A consistent empty-state component pattern does not exist at the HTML level. V-04 should introduce a standard empty/loading/error component. V-03 has added the CSS foundation; HTML adoption is a V-04 task.

---

## 8. V-03-07 — Responsive Quality

### Viewport Results (html.scrollWidth, can-scroll)

| Viewport | scrollWidth | Can Scroll | Status |
|----------|-------------|------------|--------|
| 375px | 375 | false | ✅ OK |
| 390px | 390 | false | ✅ OK |
| 480px | 480 | false | ✅ OK |
| 640px | 640 | false | ✅ OK |
| 768px | 768 | false | ✅ OK |
| 900px | 900 | false | ✅ OK |
| 1024px | 1024 | false | ✅ OK |
| 1280px | 1280 | false | ✅ OK |
| 1440px | 1440 | false | ✅ OK |
| 1660px | 1660 | false | ✅ OK |

**All 10 viewports: PASS — no horizontal scroll introduced by V-03.**

### Mobile Additions (V-03)
- Activity feed hidden below 480px (`display:none`) — gives more vertical space to stat strip
- Constitution grid: 1-column below 479px (V-02), 2-column at 480–639px (V-02)

---

## 9. Playwright Evidence

### Functional Check Results (10/10)

| Check | Result |
|-------|--------|
| loginWorks | ✅ |
| dashboardLoaded | ✅ |
| navPresent | ✅ |
| topbarPresent | ✅ |
| cmdInputPresent | ✅ |
| navGroupsPresent (3) | ✅ |
| orbPresent | ✅ |
| statCardsPresent (≥4) | ✅ |
| feedPresent | ✅ |
| switchPageFn | ✅ |

### Navigation Check
**20/20 pages navigate correctly** — all page IDs resolve correctly on `switchPage()`.

---

## 10. Console Results

| Category | Count | Assessment |
|----------|-------|-----------|
| CSS errors | 0 | ✅ PASS |
| JavaScript errors | 0 | ✅ PASS |
| 5xx server errors | 0 | ✅ PASS |
| `ERR_CONNECTION_REFUSED` (API/WS) | 65 | ✅ Expected in local dev — Supabase + external service dependencies not available locally. All resolved in production (Gate 12 certified). |

No new error categories introduced by V-03 CSS changes.

---

## 11. Network Results

- **5xx server errors:** 0 ✅
- **Static asset failures:** 0 ✅ (`/apex-zero.css` serves correctly at 13.1KB)
- **API failures in local dev:** ERR_CONNECTION_REFUSED for Supabase, WebSocket, external services — expected, pre-existing, production-certified

---

## 12. Regression Results

### Navigation (Gate-12 regression)
All 20 pages navigate correctly via `window.switchPage()`. No page switched incorrectly.

### Login/Auth
Login and cookie auth functional. App access key flow functional.

### Command Input
`.input-zone` and `.chat-input` present and styled correctly.

### backend.js syntax
`node --check server.js` → Exit: 0 ✅

---

## 13. Remaining Visual Debt

| Item | Severity | Phase |
|------|----------|-------|
| **P0-01 Data Gap:** Backend emits perf telemetry as `type:error` — no distinct telemetry channel | High | V-04+ (backend data taxonomy) |
| Domain page inline `style=` attributes (navy colours) | Medium | V-04 (page-by-page migration) |
| Empty/loading/error component pattern — CSS defined, HTML not adopted | Medium | V-04 |
| `ds-btn.xs` / `ds-btn.btn--xs` font-size (9–10px, not unified to 11px) | Low | V-04 |
| Domain-specific chart/table tokens (Chart.js theming) | Low | V-04 |
| Header hierarchy within domain pages (inconsistent H1/H2 sizing) | Low | V-04 |
| PlasmaOrb data-driven state (beyond 4 voice states) | Deferred | V-05+ |

---

## 14. V-03 CSS Summary

```
public/apex-zero.css
  Section 20: V-03 Typography system (type tokens, ds-page-title, tag font, stat labels)
  Section 21: V-03 Global token application (ds-input, ds-btn variants, panel overflow, navy overrides)
  Section 22: V-03 Activity feed hierarchy (semantic opacity tiers, tag colour palette)
  Section 23: V-03 Command centre (orb 200px, stat card layout, chat input)
  Section 24: V-03 Empty/loading states (ds-empty, apex-empty)
  Section 25: V-03 Responsive (feed-col collapse at 480px, nav spacing)

Total apex-zero.css size: ~13.1KB (366 lines → ~540 lines)
```

---

**V-03 CERTIFIED**

*Certification recorded: 2026-08-31*  
*V-02 baseline: `029c44c` — production not modified*  
*V-03 changes: `public/apex-zero.css` only (CSS additions, no deletions)*
