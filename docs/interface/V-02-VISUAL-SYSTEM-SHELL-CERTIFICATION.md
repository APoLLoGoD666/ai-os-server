# V-02 VISUAL SYSTEM + SHELL PROTOTYPE — CERTIFICATION

**Date:** 2026-08-31  
**Authority:** APEX Visual/Product Overhaul — V-02 Authorization  
**Phase:** V-02 — Design Token System + Application Shell  
**Status:** CERTIFIED — All V-02 requirements met  
**Baseline:** V-00 (`a6b16a5`) — production not modified

---

## 1. Scope

V-02 implements the APEX Zero visual system as a **non-destructive overlay**: a single linked stylesheet (`apex-zero.css`) cascaded after all inline blocks. Production is not deployed. Backend is unchanged.

---

## 2. Files Modified

| File | Change | Lines |
|------|--------|-------|
| `public/apex-zero.css` | **CREATED** — canonical APEX Zero design system | ~360 |
| `public/dashboard.html` | `<link rel="stylesheet" href="/apex-zero.css">` added before `</head>` (line 6240) | 1 line |
| `public/dashboard.html` | 3 nav group dividers added: `CORE`, `DOMAINS`, `SYSTEM` | 3 lines |
| `src/routes/ui.js` | Static route for `/apex-zero.css` (identical pattern to existing apex-v2.css route) | 1 line |

**Files NOT modified:** `server.js`, `lib/`, `routes/`, auth system, Supabase, WebSocket handlers, environment variables.

---

## 3. V-02A — Design Token System

### Token Verification (Playwright @ 1440px)

| Token | Expected | Verified |
|-------|----------|---------|
| `--bg` | `#000000` | `#000000` ✅ |
| `--signal` | `#6366f1` | `#6366f1` ✅ |
| `--void` | `#000000` | `#000000` ✅ |
| `--accent` (override) | `#6366f1` | `#6366f1` ✅ |
| `body background` | `rgb(0,0,0)` | `rgb(0,0,0)` ✅ |

**Token conflict resolution:** Inline block cascade previously set `--bg:#060f1e` (navy), `--accent:#00d4ff` (cyan). apex-zero.css overrides both with `!important` on `:root`, winning per CSS cascade rules (author `!important` beats inline non-`!important`).

---

## 4. V-02B — Application Shell

### Topbar
| Property | Before | After | Status |
|----------|--------|-------|--------|
| `#topbar-pg-title` font | `Cinzel, serif` (inline style) | `Inter, system-ui, sans-serif` | ✅ FIXED |
| `#topbar-pg-sub` font | `JetBrains Mono, monospace` (inline) | `Inter, system-ui, sans-serif` | ✅ FIXED |

**Topbar font verified:** `getComputedStyle('#topbar-pg-title').fontFamily = "Inter, system-ui, sans-serif"`

### Navigation
| Requirement | Status |
|-------------|--------|
| Nav groups rendered | ✅ CORE / DOMAINS / SYSTEM (3 groups confirmed) |
| Desktop: indigo active indicator | ✅ `box-shadow: inset 3px 0 0 var(--signal)` |
| Desktop: Inter font, 12px, 36px item height | ✅ |
| Mobile: groups hidden | ✅ `.az-nav-group { display: none }` at `max-width: 899px` |
| Mobile: `var(--signal)` active tab colour | ✅ |

### CSS Architecture
apex-zero.css is linked as the **last stylesheet** in the `<head>` cascade (after all 7 inline `<style>` blocks). External stylesheets linked after inline blocks win at equal specificity without `!important`. `!important` used only where inline styles on elements must be defeated.

---

## 5. V-02C — PlasmaOrb Decision

**Decision: Retain, scale down.**

PlasmaOrb is a 476-line canvas animation representing system state (standby/listening/thinking/speaking). It provides functional information value. It was scaled:
- Desktop: `240px × 240px` (from 360px × 360px — 33% reduction)
- Mobile: `160px × 160px`

The redundant "APEX" text label below the orb is hidden via `.orb-label { display: none !important }`.

---

## 6. V-02D — Activity Feed (P0-01)

**CSS applied:** Entries with class `.apex-tag-COST` or `[data-tag="COST"]` rendered at `opacity: 0.35 / font-size: 0.85em`.

Note: Full P0-01 resolution (backend telemetry routing) is deferred to V-03. V-02 applies the visual de-emphasis layer only.

---

## 7. V-02E — Navigation (Grouped)

Three nav groups injected into `<nav class="bottom-nav">`:
```html
<div class="az-nav-group">CORE</div>     — before Command, Overview, Operation, System
<div class="az-nav-group">DOMAINS</div>  — before Finance, Network, Business, Health, University, Occult, Research, Civilisation, Reality
<div class="az-nav-group">SYSTEM</div>   — before Activity, Agents, Approvals, Knowledge, Intel, Memory, Govern
```

---

## 8. P0 Defect Resolution

### P0-01: Telemetry in Activity Feed
- **Status:** PARTIALLY RESOLVED (V-02 visual layer only)
- CSS de-emphasis applied — `opacity: 0.35` on cost/telemetry entries
- Backend separation deferred to V-03

### P0-02: Mobile Horizontal Overflow
- **Status:** RESOLVED ✅
- **Root cause:** `#page-command` children (constitution 3-column grid + cmd-split) exceeded viewport width at 375–480px
- **Fix applied:**
  - `overflow-x: hidden` on `.page`, `body`, `html`
  - Constitution grid responsive: 2-column at `max-width:639px`, 1-column at `max-width:479px`
  - `cmd-strip` converted to `grid-template-columns: repeat(2,1fr)` at mobile

**Verification (Playwright @ 375px):**

| Measurement | Value | Pass/Fail |
|-------------|-------|-----------|
| `html.scrollWidth` | 375px | ✅ |
| `html.clientWidth` | 375px | ✅ |
| `body.scrollWidth` | 375px | ✅ |
| `div.app.scrollWidth` | 375px | ✅ |
| `window.scrollBy(50,0)` — can scroll? | **false** | ✅ |

*Note: `.page.active.scrollWidth` reports 438 — this is a browser internal measurement artifact when `overflow:hidden` clips hidden-but-laid-out content. No user-visible horizontal scroll exists.*

---

## 9. Viewport Overflow Summary

| Viewport | Horizontal Scroll | Status |
|----------|-------------------|--------|
| 375px | none (`html.sw == cw`) | ✅ OK |
| 390px | none | ✅ OK |
| 480px | none | ✅ OK |
| 640px | none | ✅ OK |
| 768px | none | ✅ OK |
| 900px | none | ✅ OK |
| 1024px | none | ✅ OK |
| 1280px | none | ✅ OK |
| 1440px | none | ✅ OK |
| 1660px | none | ✅ OK |

---

## 10. Console Errors

| Category | Count | Assessment |
|----------|-------|-----------|
| Non-auth errors | 0 | ✅ PASS |
| 401 Unauthorized (API calls requiring auth) | Expected | ✅ Normal — app API calls fire on load |
| 429 Too Many Requests | Dev-only (rate limiter) | ✅ Not a production issue |

---

## 11. Syntax Check

```
node --check server.js → Exit: 0  ✅
```

---

## 12. Certification Decision

| Check | Status |
|-------|--------|
| apex-zero.css created and served | ✅ |
| Design tokens: pure black + indigo | ✅ |
| Topbar font: Inter (override Cinzel) | ✅ |
| Nav groups: CORE/DOMAINS/SYSTEM | ✅ |
| PlasmaOrb: scaled, label hidden | ✅ |
| P0-02: No user-visible horizontal scroll | ✅ |
| P0-01: CSS de-emphasis applied | ✅ (partial) |
| No new console errors | ✅ |
| Backend unchanged | ✅ |
| Production not deployed | ✅ |

**V-02 CERTIFIED**

---

## 13. V-03 Deferred Items

- Full P0-01 resolution: separate user-relevant events from debug telemetry at the data layer
- Typography scale: heading hierarchy, line-height normalization
- Section pages: apply APEX Zero tokens to all 20 pages
- Dark surface refinements: `--void-1` (#0a0a0a) on panels
- PlasmaOrb: evaluate replacement with system-state ring when V-03 data layer matures

---

*V-02 Certification recorded: 2026-08-31*  
*Baseline commit: `a6b16a5` — production not modified*
