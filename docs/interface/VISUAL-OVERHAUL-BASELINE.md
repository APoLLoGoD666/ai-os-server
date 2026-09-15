# VISUAL OVERHAUL BASELINE — V-00

**Date:** 2026-08-31  
**Authority:** APEX Visual/Product Overhaul Authorization  
**Phase:** V-00 — Immutable Baseline Freeze  
**Status:** FROZEN — No code modifications performed

---

## 1. Production State Verification

| Attribute | Value |
|-----------|-------|
| Production URL | `https://apex-ai-os-cos.uk/` |
| Deployed commit | `5a6687f` (feat: APEX production interface cutover — Phase C–H + P1 + P2-01) |
| Certification commit | `a6b16a5` (Gate 12 Playwright walkthrough complete) |
| Health endpoint | `status:ok`, `db:true`, `tts:true`, `ai:true`, `version:5a6687f` |
| Working tree state | Clean — 2 untracked pre-phase-f backup files only (excluded) |
| Gate 12 | CERTIFIED — 46/46 programmatic checks PASS |

**Untracked files (NOT part of baseline):**
- `public/apex-v2.css.pre-phase-f-structural` — pre-phase-F backup
- `public/dashboard.html.pre-phase-f-structural` — pre-phase-F backup

---

## 2. Interface Structure

### File Map

| File | Role | Lines | Notes |
|------|------|-------|-------|
| `public/dashboard.html` | Sole frontend entry point | 19,870 | All UI, CSS, and JS inline |
| `public/apex-v2.css` | Design system file | 1,446 | **NOT LINKED** — exists but unloaded |
| `public/apex-custom.css` | Override hook | ~5 | Linked but empty (0 rules) |
| `src/components/orb/PlasmaOrb.js` | Canvas orb animation | 476 | Loaded via `<script>` at line 18355 |
| `public/js/components/contextual-card.js` | Contextual card component | — | Loaded at line 19868 |

### What `dashboard.html` contains
- `<head>`: Google Fonts preloads, Supabase CDN JS, manifest, PWA meta tags
- `<style>` block 0 (line 21): APEX v11 Design Tokens (123,107 bytes)
- `<style>` block 1 (line 2635): APEX v12 · Obsidian Neural Interface (40,052 bytes)
- `<style>` block 2 (line 3635): APEX Design Unification Pass (67,218 bytes)
- `<style>` block 3 (line 5369): APEX MASTER — 1000-Item Precision Upgrade (42,116 bytes)
- `<style>` block 4 (line 6215): Phase F-Immediate patch (860 bytes)
- `<style>` block 5: Pipeline card cursor (558 bytes)
- `<style>` block 6: `.cx-card` contextual card styles (1,757 bytes)
- Full application HTML (topbar, sidebar, all 20 page sections)
- All application JavaScript (inline)
- `<script src="/src/components/orb/PlasmaOrb.js">` at line 18355
- `<script src="/js/components/contextual-card.js">` at line 19868

**Total inline CSS: ~275,668 bytes across 7 style blocks**

---

## 3. CSS Architecture (As-Is)

### External Stylesheets Loaded

| Source | Type | Rules |
|--------|------|-------|
| Google Fonts (Cinzel + JetBrains Mono + Inter) | External CDN | n/a |
| `/apex-custom.css` | External file | 0 (empty) |
| `apex-v2.css` | External file | **NOT LINKED** |

### Inline Style Block Cascade (wins in declaration order)

```
Block 0: APEX v11    (123KB) — defines: --bg:#000000, --accent:indigo
Block 1: APEX v12     (40KB) — overrides: --bg:#060f1e, --accent:#00d4ff
Block 2: Unification  (67KB) — further overrides
Block 3: MASTER       (42KB) — final authority for all tokens ← DOMINANT
Block 4: Phase-F patch (1KB) — 4 targeted corrections
Block 5: Pipeline      (1KB)
Block 6: cx-card       (2KB)
```

The MASTER block (index 3) defines the effective design system. v11, v12, and Unification blocks are partially shadowed.

### Design Token System (Effective — from MASTER block)

| Token | Effective Value | Intended (apex-v2.css) | Conflict |
|-------|----------------|------------------------|---------|
| `--bg` | `#060f1e` (dark navy) | `#000000` (pure black) | YES |
| `--surface` / `--s1` | `#0d1424` (navy surface) | `#0c0c0c` (near-black) | YES |
| `--accent` | `#00d4ff` (cyan) | `#6366f1` (indigo) | YES |
| `--text` | `#eef2ff` (indigo-50) | `#f4f4f5` (neutral-100) | minor |
| `--topbar-h` | `48px` (computed) | `44px` (token) | YES |
| `--sidebar-w` | `200px` (token) | `200px` | partial |
| body background | `rgb(6, 15, 30)` | `#000000` | YES |
| Panel background | `rgb(13, 20, 36)` | `#0c0c0c` | YES |
| Nav button colour | `rgb(238, 242, 255)` | `#f4f4f5` | minor |

**`apex-v2.css` is unlinked — its token definitions have no effect on production.**

---

## 4. Typography System (Active)

| Family | Source | Uses |
|--------|--------|------|
| `Inter` (300–700) | Google Fonts | Body, nav, most UI text |
| `Cinzel` (600–700) | Google Fonts | Page title in topbar (`#topbar-pg-title`) |
| `JetBrains Mono` (400–600) | Google Fonts | Subtitle in topbar (`#topbar-pg-sub`), constitution labels |

**Three font families active. No variable font. No design-token font references in topbar inline styles.**

---

## 5. Page / Navigation Inventory

### All 20 Application Pages

| Page ID | Nav Label | Category |
|---------|-----------|----------|
| `page-command` | Command | Core (default) |
| `page-overview` | Overview | Core |
| `page-operation` | Operation | Core |
| `page-system` | System | Core |
| `page-communication` | Network | Domain |
| `page-finance` | Finance | Domain |
| `page-business` | Business | Domain |
| `page-health` | Health | Domain |
| `page-university` | University | Domain |
| `page-occult` | Occult | Domain |
| `page-research` | Research | Domain |
| `page-civilisation` | Civilisation | Domain |
| `page-reality` | Reality | Domain |
| `page-activity` | Activity | Meta |
| `page-agents` | Agents | Meta |
| `page-approvals` | Approvals | Meta |
| `page-knowledge` | Knowledge | Meta |
| `page-intelligence` | Intel | Meta |
| `page-memory` | Memory | Meta |
| `page-governance` | Govern | Meta |

**Page rendering architecture:** All 20 pages rendered simultaneously as `display:flex`, `position:absolute`, `opacity:0`. Active page: `opacity:1`. No `display:none` toggling. All panels computed at all times.

### Desktop Navigation (≥900px)
- Position: left sidebar, `position:static`, starting at y=48 (below topbar)
- Width: 280px at ≥1280px / 200px at 900–1279px (CSS token `--sidebar-w: 200px` inconsistent with rendered width)
- 21 items: 20 pages + "More" trigger
- Item spacing: 40px per item on desktop, 49px on mobile nav
- **No visual grouping or section dividers**
- Unicode symbols as icons: `⬡ ◈ ⊞ ◉ ◎` — geometric characters, no icon library

### Mobile Navigation (<900px)
- Position: **fixed** bottom bar
- Height: 49px
- Background: `rgba(0,0,0,0.97)`
- Visible tabs: COMMAND | ACTIVITY | AGENTS | APPROVALS | MORE (5 tabs)
- Other pages accessible via "More" sheet

---

## 6. Component Inventory

| Component | CSS Class | Location | Notes |
|-----------|-----------|----------|-------|
| Topbar | `.topbar` | All viewports | Contains page name, subtitle, clock |
| Sidebar/nav | `.bottom-nav` | Desktop only | 21-item vertical list |
| Mobile nav | `.bottom-nav` (fixed) | Mobile | 5-tab bottom bar |
| PlasmaOrb | `<canvas>` (JS-rendered) | Command page | 3D wireframe sphere animation |
| Command split | `.cmd-split` | Command page | 2-column: main + feed |
| Stat cards | `.cmd-stat` | Command page | 4 cards: Balance, Messages, Tasks, System Health |
| Activity feed | — | Command page, mobile | Timestamped event list |
| Constitution | — | Command page | 6-card APEX Operating Charter |
| Panel | `.ds-panel` | All sections | 89 panels rendered at all times |
| Stat card (section) | `.ds-stat-card` | All sections | 22 rendered at all times |
| Badge | `.ds-badge` | Multiple | Color variants |
| Button | `.ds-btn` | Multiple | Multiple size/color variants |
| Chat input zone | `.input-zone` | Command page | Height 52px fixed |
| Input | `.chat-input` | Command page | Textarea |

---

## 7. Responsive Breakpoints (Measured)

| Viewport | Nav mode | Sidebar width | Content width | Layout notes |
|----------|----------|---------------|---------------|-------------|
| 375px | Fixed bottom bar | 375px (bottom, 49px tall) | 375px | No orb |
| 390px | Fixed bottom bar | 390px (bottom, 49px tall) | 390px | No orb |
| 480px | Fixed bottom bar | 480px (bottom, 49px tall) | 480px | No orb |
| 640px | Fixed bottom bar | 640px (bottom, 49px tall) | 640px | No orb visible |
| 768px | Fixed bottom bar | 768px (bottom, 49px tall) | 768px | Orb visible, very large |
| 900px | Fixed left sidebar | 200px | 700px | Desktop layout begins |
| 1024px | Fixed left sidebar | 200px | 824px | — |
| 1280px | Fixed left sidebar | 260px | 1020px | Sidebar wider |
| 1440px | Fixed left sidebar | 280px | 1160px | cmd-main: 880px, feed: 280px |
| 1660px | Fixed left sidebar | 280px | 1380px | cmd-main: 1100px, feed: 280px |

**Breakpoint trigger: `@media (min-width: 900px)` — single breakpoint, binary layout switch.**

---

## 8. External Dependencies (Visual)

| Dependency | Version | Use |
|-----------|---------|-----|
| Google Fonts — Inter | 300–700 | Primary text |
| Google Fonts — Cinzel | 600–700 | Page title serifs |
| Google Fonts — JetBrains Mono | 400–600 | Code/mono text |
| Chart.js | 4.4.0 | Data visualisation (CDN) |
| Supabase JS | 2.x | Client-side DB reads |
| PlasmaOrb.js | v3 (local) | Canvas orb animation |

---

## 9. Certification Artifacts (Protected)

| Artifact | Location |
|----------|----------|
| Gate 12 browser verification | `docs/interface/GATE-12-PRODUCTION-BROWSER-VERIFICATION.md` |
| Cutover certification | `docs/interface/PRODUCTION-INTERFACE-CUTOVER-CERTIFICATION.md` |
| Phase H responsive certification | `docs/interface/UX-18-MOBILE-RESPONSIVE.md` |
| Phase C–H UX certification | `docs/interface/UX-00` through `UX-19` |

---

## 10. Protected Runtime (Frozen — Not in Scope)

The following are excluded from the visual overhaul scope. Any visual change that requires modifying these must be **documented and stopped**:

- `server.js` — backend routes, agent logic, runtime
- `lib/` — middleware, clients, helpers
- `routes/` — API route handlers
- `src/routes/` — Express routes
- Authentication system (`requireAuth`, `requireAppAccess`, JWT)
- Supabase schema / queries
- WebSocket handlers (`/ws/viz`, `/ws/gemini-live`)
- Environment variables
- Production configuration (Render)
- `scripts/certify.js`

---

*V-00 Baseline freeze recorded: 2026-08-31*  
*No code modifications performed.*  
*Commit: `a6b16a5` (current HEAD)*
