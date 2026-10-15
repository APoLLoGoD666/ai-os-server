# GAP-29 SVG ASSET REQUIREMENTS SPECIFICATION

**Date:** 2026-08-28  
**Status:** OPEN — ASSETS NOT DELIVERED  
**Classification:** READ-ONLY SPECIFICATION — no production files modified  
**Authority:** UX-05 §14, BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md (Phase B), POST-UX-19-PRODUCTION-GAP-INVENTORY.md §GAP-29, prototype/apex-command-prototype.html

---

## 1. Status

**GAP-29: OPEN — ASSETS NOT DELIVERED**

No SVG files exist anywhere under `public/`. No SVG sprite sheet exists. No icon registry exists. The 20 navigation buttons currently use Unicode symbolic characters (emoji and geometric symbols) as icons. Phase B cannot proceed until a complete SVG sprite sheet is delivered.

---

## 2. Blocking Condition

Phase B implementation requires two steps:

> **Phase B step 4:** Deliver SVG sprite sheet (GAP-29 prerequisite)  
> **Phase B step 5:** Replace nav button icons with `<use xlink:href="#icon-*">` references (GAP-29)

Step 4 is a *prerequisite delivery action* — the designer/operator must provide the SVG paths for each icon. Step 5 is an *implementation action* that replaces the `<span class="nav-icon">` character content with `<svg><use>` references. Step 5 cannot execute until Step 4 is fulfilled.

Additionally, from the reconnaissance final recommendation (line 474):
> "Phases B through F are blocked by GAP-01 design delivery (progressive disclosure specification) and GAP-29 asset delivery (SVG sprites). No implementation of the 5-surface navigation collapse or legacy page retirement should begin before these prerequisites are met."

**Phase B is blocked solely by missing icon paths.** The technical integration pattern (sprite structure, CSS hooks, element IDs) is fully specified and implementation-ready.

**Regression note:** The existing test `tests/rx-07-p1.test.js` P7-10 currently asserts `!dash.includes('ds-icon-sprite')` (sprite absent, as expected pre-Phase B). When Phase B is implemented and `ds-icon-sprite` is present in `dashboard.html`, this assertion must be inverted — similar to how `tests/rx-04-p1.test.js` P4-12 was updated in RX-07. The Phase B regression suite must include an updated P7-10 check.

---

## 3. Required Asset Inventory

### 3.1 Navigation surface requiring icons

Single navigation element: `<nav class="bottom-nav">` at line 12640 of `public/dashboard.html`. This element functions as:
- **Desktop**: vertical sidebar rail (200px wide, `grid-area: sidebar`)
- **Mobile**: hidden behind `#mobileNavDropdown` hamburger (text-only buttons, no icons, not in Phase B scope)

Phase B replaces icons in the 20 registered `.nav-btn` buttons (the `.bottom-nav` rail). Mobile hamburger buttons (`._mnav-btn`) are text-only and are NOT in Phase B scope.

### 3.2 Icon inventory table

| # | Nav button ID | Current character | Current label text | Proposed symbol ID | Phase D mapping | Prototype path available |
|---|--------------|------------------|-------------------|-------------------|-----------------|--------------------------|
| 1 | `nav-command` | ⬡ | Command | `icon-command` | Command surface (survives Phase D) | **YES** — star polygon |
| 2 | `nav-overview` | ◈ | Overview | `icon-overview` | World surface candidate (reconnaissance) | Partial — World globe from prototype may apply |
| 3 | `nav-operation` | ⊞ | Operation | `icon-operation` | World surface (Phase E retirement) | **NO** |
| 4 | `nav-system` | ◉ | System | `icon-system` | System surface (survives Phase D) | **YES** — terminal/server |
| 5 | `nav-finance` | ◎ | Finance | `icon-finance` | World surface (Phase E retirement) | **NO** |
| 6 | `nav-communication` | ✉ | Network | `icon-communication` | World surface (Phase E retirement) | **NO** |
| 7 | `nav-business` | ◧ | Business | `icon-business` | World surface (Phase E retirement) | **NO** |
| 8 | `nav-health` | ◑ | Health | `icon-health` | World surface (Phase E retirement) | **NO** |
| 9 | `nav-university` | ◫ | University | `icon-university` | World surface (Phase E retirement) | **NO** |
| 10 | `nav-occult` | ◬ | Occult | `icon-occult` | World surface (Phase E retirement) | **NO** |
| 11 | `nav-research` | ◈ | Research | `icon-research` | World/Knowledge surface (Phase E retirement) | **NO** |
| 12 | `nav-civilisation` | ⊛ | Civilisation | `icon-civilisation` | World surface (Phase E retirement) | **NO** |
| 13 | `nav-reality` | ◍ | Reality | `icon-reality` | World surface (Phase E retirement) | **NO** |
| 14 | `nav-activity` | ◎ | Activity | `icon-activity` | Decisions surface (Phase E retirement) | **NO** |
| 15 | `nav-agents` | ◈ | Agents | `icon-agents` | Decisions surface (Phase E retirement) | **NO** |
| 16 | `nav-approvals` | ◇ | Approvals | `icon-approvals` | Decisions surface (Phase E retirement) | **NO** |
| 17 | `nav-knowledge` | ◆ | Knowledge | `icon-knowledge` | Knowledge surface (survives Phase D) | **YES** — open book |
| 18 | `nav-intelligence` | ◇ | Intel | `icon-intelligence` | Knowledge surface (Phase E retirement) | **NO** |
| 19 | `nav-memory` | ▣ | Memory | `icon-memory` | System surface (Phase E retirement) | **NO** |
| 20 | `nav-governance` | ⚖ | Govern | `icon-governance` | System surface (Phase E retirement) | **NO** |
| 21 | `nav-more` | ••• | More | `icon-more` | Not in Phase D (hidden button) | **NO** |

**Total icons required: 20 minimum** (nav-more is `display:none` but the button exists in DOM; its icon is UNSPECIFIED as in-scope).

**Icon duplication in current nav (characters used multiple times):**
- ◈ used by: overview, research, agents (3 buttons share one glyph — each must receive a distinct SVG)
- ◎ used by: finance, activity (2 buttons)
- ◇ used by: approvals, intelligence (2 buttons)

Each nav button must receive a semantically distinct SVG icon regardless of current character duplication.

### 3.3 Prototype-available icon paths

The prototype file `docs/interface/prototype/apex-command-prototype.html` (line 1153) contains 5 specified SVG icons using the canonical spec (`viewBox="0 0 20 20"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `currentColor`). These are design-artefact prototypes, not production assets.

| Prototype nav label | SVG path content | Direct mapping to current nav | Notes |
|--------------------|-----------------|-------------------------------|-------|
| Command | `<polygon points="10,2 12.5,8.5 19,9.5 14.5,14 15.9,20 10,17 4.1,20 5.5,14 1,9.5 7.5,8.5"/>` | `nav-command` | Star/hexagon badge — directly applicable |
| World | `<circle cx="10" cy="10" r="8"/>` + `<path d="M2 10h16M10 2a14 14 0 0 1 0 16M10 2a14 14 0 0 0 0 16"/>` | `nav-overview` (candidate) | Phase D "World" surface icon; whether to use for `nav-overview` is a designer decision |
| Decisions | `<path d="M10 2v16M3 7l7-5 7 5M4 10l6 3 6-3M4 14l6 3 6-3"/>` | None — Phase D surface only | No current page named "Decisions"; closest is `nav-approvals` but this is a designer decision |
| Knowledge | `<path d="M4 3h9a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H4"/>` + `<path d="M4 3v14a2 2 0 0 0 2 2M7 8h7M7 12h5"/>` | `nav-knowledge` | Open book — directly applicable |
| System | `<rect x="2" y="4" width="16" height="12" rx="2"/>` + `<path d="M6 8h8M6 12h5M14 12h1"/>` + `<circle cx="15" cy="8" r="1" fill="currentColor"/>` | `nav-system` | Terminal/server — directly applicable |

**Available immediately (paths confirmed from prototype):** `icon-command`, `icon-knowledge`, `icon-system` — 3 of 20.

**Designer decision required (paths exist in prototype but mapping is ambiguous):** `icon-overview` (World globe), `icon-approvals` (Decisions stack) — whether the Phase D surface icons are the right semantic choice for the current per-page icons is a product/design decision.

**Must be designed from scratch:** All remaining 15–17 icons.

---

## 4. Sprite Requirements

### 4.1 Sprite container

| Attribute | Value | Source |
|-----------|-------|--------|
| Element | `<svg>` | — |
| Container ID | `ds-icon-sprite` | `tests/rx-07-p1.test.js` P7-10 (checks for its presence post-Phase B) |
| Visibility | `display:none` | Standard SVG sprite pattern — sprite not rendered, only referenced |
| Placement | Inside `<body>` before or after `<nav class="bottom-nav">` | UNSPECIFIED — logical placement at top of `<body>` or inline before `</body>` |
| File location | Inline in `public/dashboard.html` OR external file at `/public/icons.svg` | UNSPECIFIED — both valid; POST-UX-19 gap inventory notes "SVG asset files (new)" suggesting an external file |

### 4.2 Symbol structure

Each icon is defined as a `<symbol>` inside the sprite container:

```xml
<svg id="ds-icon-sprite" style="display:none" xmlns="http://www.w3.org/2000/svg">
  <symbol id="icon-command" viewBox="0 0 20 20">
    <!-- SVG paths here -->
  </symbol>
  <symbol id="icon-overview" viewBox="0 0 20 20">
    <!-- SVG paths here -->
  </symbol>
  <!-- … one <symbol> per icon … -->
</svg>
```

| Attribute | Value | Source |
|-----------|-------|--------|
| `viewBox` | `0 0 20 20` | UX-05 §14.1 "Grid: 20×20px"; prototype confirms |
| `stroke` | Not on `<symbol>` — set on referencing `<svg>` or `<use>` | currentColor is inherited |
| Content style | Outlined, stroke-based | UX-05 §14.1 |

### 4.3 Per-symbol path requirements

| Attribute | Specified value | Source |
|-----------|----------------|--------|
| `viewBox` | `0 0 20 20` | UX-05 §14.1; prototype |
| `fill` | `none` on root paths (unless a path is intentionally filled) | UX-05 §14.1 "Outlined"; prototype uses `fill="none"` on SVG root; prototype System icon uses `fill="currentColor"` on a single accent circle |
| `stroke` | `currentColor` | UX-05 §14.1; prototype |
| `stroke-width` | `1.5` at 20px grid | UX-05 §14.1 |
| `stroke-linecap` | `round` | UX-05 §14.1 "Rounded joins and caps"; prototype |
| `stroke-linejoin` | `round` | UX-05 §14.1 "Rounded joins"; prototype |
| Semantic states | Default: currentColor; Hover: primary colour; Active: primary colour | UX-05 §14.4 — these are CSS-driven, not SVG-level attributes |

### 4.4 Rendered size

Nav icon context = `--apex-icon-md` = **18px** (UX-05 §14.2). The `.nav-icon` element width is currently declared in CSS at 18px or 22px depending on which CSS block wins. The rendered SVG should fill its container via CSS; no fixed `width`/`height` attribute should be hardcoded on the `<use>` element. CSS handles sizing.

### 4.5 Accessibility

Per UX-05 §14.5:
- Nav buttons have adjacent text labels (`.nav-label`) — the icon is decorative relative to the label
- Icons in this context must carry `aria-hidden="true"` on the `<svg>` wrapper
- `aria-label` is already present on the nav button elements (lines 12696–12729 of `dashboard.html`) — no change required to button ARIA

```html
<!-- Correct pattern (aria-hidden on decorative icon) -->
<span class="nav-icon">
  <svg aria-hidden="true"><use href="#icon-command"/></svg>
</span>
```

### 4.6 No external icon library

Per UX-05 §14.6 (PROTECT decision from UX-00): Heroicons, Lucide, Font Awesome, and CDN icon libraries are explicitly prohibited. All icons must be custom SVGs defined in-project.

---

## 5. Integration Mapping

For every nav button, Phase B step 5 performs the following transformation:

### Current HTML pattern (all 20 nav buttons):

```html
<button class="nav-btn" id="nav-{name}">
  <span class="nav-icon">{character}</span>
  <span class="nav-label">{Label}</span>
</button>
```

### Target HTML pattern after Phase B:

```html
<button class="nav-btn" id="nav-{name}">
  <span class="nav-icon">
    <svg aria-hidden="true"><use href="#icon-{name}"/></svg>
  </span>
  <span class="nav-label">{Label}</span>
</button>
```

### Per-button integration map:

| Current control | Required symbol | Target element | Expected Phase B change |
|-----------------|----------------|----------------|------------------------|
| `nav-command` — ⬡ in `.nav-icon` | `#icon-command` | `<use href="#icon-command"/>` inside `<svg aria-hidden="true">` | Prototype star polygon |
| `nav-overview` — ◈ | `#icon-overview` | `<use href="#icon-overview"/>` | Globe paths (designer decision) or new design |
| `nav-operation` — ⊞ | `#icon-operation` | `<use href="#icon-operation"/>` | New design required |
| `nav-system` — ◉ | `#icon-system` | `<use href="#icon-system"/>` | Prototype terminal/server |
| `nav-finance` — ◎ | `#icon-finance` | `<use href="#icon-finance"/>` | New design required |
| `nav-communication` — ✉ | `#icon-communication` | `<use href="#icon-communication"/>` | New design required |
| `nav-business` — ◧ | `#icon-business` | `<use href="#icon-business"/>` | New design required |
| `nav-health` — ◑ | `#icon-health` | `<use href="#icon-health"/>` | New design required |
| `nav-university` — ◫ | `#icon-university` | `<use href="#icon-university"/>` | New design required |
| `nav-occult` — ◬ | `#icon-occult` | `<use href="#icon-occult"/>` | New design required |
| `nav-research` — ◈ | `#icon-research` | `<use href="#icon-research"/>` | New design required |
| `nav-civilisation` — ⊛ | `#icon-civilisation` | `<use href="#icon-civilisation"/>` | New design required |
| `nav-reality` — ◍ | `#icon-reality` | `<use href="#icon-reality"/>` | New design required |
| `nav-activity` — ◎ | `#icon-activity` | `<use href="#icon-activity"/>` | New design required |
| `nav-agents` — ◈ | `#icon-agents` | `<use href="#icon-agents"/>` | New design required |
| `nav-approvals` — ◇ | `#icon-approvals` | `<use href="#icon-approvals"/>` | Prototype "Decisions" stack may apply (designer decision) |
| `nav-knowledge` — ◆ | `#icon-knowledge` | `<use href="#icon-knowledge"/>` | Prototype open book |
| `nav-intelligence` — ◇ | `#icon-intelligence` | `<use href="#icon-intelligence"/>` | New design required |
| `nav-memory` — ▣ | `#icon-memory` | `<use href="#icon-memory"/>` | New design required |
| `nav-governance` — ⚖ | `#icon-governance` | `<use href="#icon-governance"/>` | New design required |
| `nav-more` — ••• (`display:none`) | `#icon-more` | `<use href="#icon-more"/>` | UNSPECIFIED — may be omitted if button remains permanently hidden |

### Existing stat-chip SVGs (PROTECT — NOT in Phase B scope):

The following inline SVGs in `public/dashboard.html` are already correct custom SVGs. UX-05 §14.3 explicitly marks them PROTECT. Phase B must not touch them.

| Location | Icon | Status |
|----------|------|--------|
| Line 8860 — cmdStrip balance | `viewBox="0 0 24 24"` wallet path | PROTECT |
| Line 8865 — cmdStrip messages | `viewBox="0 0 24 24"` mail path | PROTECT |
| Line 8870 — cmdStrip tasks | `viewBox="0 0 24 24"` checklist path | PROTECT |
| Line 8875 — cmdStrip system health | `viewBox="0 0 24 24"` heartbeat path | PROTECT |

Note: these stat-chip SVGs use `viewBox="0 0 24 24"` (24px grid) rather than the 20px canonical grid. UX-05 §14.3 says "retain designs, adapt to stroke weight" — this adaptation is deferred, not part of Phase B scope.

---

## 6. Missing Information

The following items must be decided by the operator/designer before Phase B implementation can be authorised. Each item that is unresolved after asset delivery must be explicitly decided before committing any production change.

| # | Decision | Current state | Impact if unresolved |
|---|----------|---------------|---------------------|
| 1 | **Icon paths for 15–17 unspecified pages** — operation, finance, communication, business, health, university, occult, research, civilisation, reality, activity, agents, approvals, intelligence, memory, governance, overview, (more) | No paths exist | Cannot implement Phase B; these are the blocking prerequisite |
| 2 | **Overview icon** — use the prototype World globe, or design a distinct overview icon | Globe paths available from prototype; appropriateness is a design decision | Phase B cannot proceed for `nav-overview` without a decision |
| 3 | **Approvals icon** — use the prototype Decisions stack, or design a distinct icon | Decisions-stack paths available; whether semantically correct for "Approvals" is a design decision | Phase B cannot proceed for `nav-approvals` without a decision |
| 4 | **Sprite file location** — inline in `dashboard.html` or external `/public/icons.svg` loaded via `<img>` fetch | UNSPECIFIED | Affects whether a new file is needed or if `dashboard.html` is the only file modified |
| 5 | **`href` vs `xlink:href`** — the reconnaissance specifies `xlink:href` but this attribute is deprecated in SVG 2.0 and not required by any modern browser | Reconnaissance says `xlink:href`; prototype uses no `<use>` references | Using `href` is correct for modern browsers; `xlink:href` requires `xmlns:xlink` namespace declaration; a decision is needed to avoid silent failure in some parsers |
| 6 | **`nav-more` button in-scope** — `id="nav-more"` is `display:none` and may remain permanently hidden through Phase D; does it need an SVG icon | UNSPECIFIED | If excluded: 20 icons needed; if included: 21 |
| 7 | **Symbol ID naming convention** — this spec proposes `icon-{page-name}` (e.g., `icon-command`, `icon-governance`) | Not explicitly documented in any authoritative source; inferred from test ID `ds-icon-sprite` and Phase B description `icon-*` glob | Must be confirmed before implementation to avoid rename cost later |
| 8 | **CSS sizing of SVG within `.nav-icon`** — 10 competing CSS blocks define `.nav-icon` at different sizes (13px, 16px, 18px, 22px, 24px); which block wins at runtime is unclear | Canonical target: 18px (`--apex-icon-md` per UX-05 §14.2) | SVG icons will render at an undefined size until the winning CSS rule is confirmed; may require a targeted CSS patch alongside Phase B |

---

## 7. Explicit Exclusions

**Confirmed during this reconnaissance session:**

| Item | Status |
|------|--------|
| SVG files created | **NONE** — zero `.svg` files exist in the project; none were created |
| Production files modified | **NONE** — `public/dashboard.html` not modified during this reconnaissance |
| GAP-27 (CSS `:root` consolidation) | **UNTOUCHED** — BLOCKED, no targets specified, not approached |
| Phase B implementation | **NOT STARTED** — reconnaissance only |
| Phase C, D, E, F | **NOT STARTED** |
| GAP-01, GAP-24, GAP-25 | **UNTOUCHED** |
| Backend, server.js, routes, database | **UNTOUCHED** |

---

## 8. Unblock Condition

**Phase B implementation is unblocked when ALL of the following are supplied:**

1. **Complete SVG path definitions** for all 20 nav button icons (or 21 including `nav-more`), conforming to the specification in Section 4:
   - `viewBox="0 0 20 20"`
   - `fill="none"` (or `fill="currentColor"` for intentional accent fills)
   - `stroke="currentColor"`
   - `stroke-width="1.5"`
   - `stroke-linecap="round"`
   - `stroke-linejoin="round"`

2. **Decision on `href` vs `xlink:href`** (Section 6, item 5)

3. **Decision on sprite location** — inline in `dashboard.html` or external file (Section 6, item 4)

4. **Symbol ID naming convention confirmed** — this spec proposes `icon-{page-name}` (Section 6, item 7)

5. **Decision on `nav-more` scope** (Section 6, item 6)

6. **Separate Phase B implementation authorisation** issued after assets are delivered

Assets may be delivered as:
- A set of SVG path strings (one per icon, copy-paste ready)
- An SVG sprite file with `<symbol>` elements already structured
- An annotated list pointing to existing path data (e.g., confirming prototype paths for command/knowledge/system)

**Minimum viable delivery (to proceed with Phase B at reduced scope):** The 3 confirmed prototype icons (command, knowledge, system) plus decisions on overview and approvals, totalling 5 icons, would permit a partial Phase B limited to those 5 nav buttons. This is not recommended — full delivery of all 20 icons is the correct approach.

---

**CONFIRMED: No production files were modified during this reconnaissance. This document is the sole output of the investigation session.**

---

GAP-29 ASSET SPECIFICATION: COMPLETE

DOCUMENT: docs/interface/GAP-29-SVG-ASSET-REQUIREMENTS.md

PRODUCTION FILES MODIFIED: NONE

SVG ASSETS CREATED: NONE

GAP-27: BLOCKED / UNTOUCHED

PHASE B: BLOCKED — AWAITING ASSET DELIVERY

NEXT ACTION: Provide the specified SVG sprite/individual SVG assets, then separately authorise Phase B implementation.
