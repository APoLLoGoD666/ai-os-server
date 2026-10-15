# GAP-29 DESIGN DECISION RECORD

**Date:** 2026-08-28  
**Status:** DESIGN/DECISION RECONNAISSANCE COMPLETE — PHASE B REMAINS BLOCKED  
**Classification:** READ-ONLY — no production files modified  
**Authority:** UX-05 §14, POST-UX-19-PRODUCTION-GAP-INVENTORY.md §GAP-29, BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md Phase B, prototype/apex-command-prototype.html, tests/rx-07-p1.test.js P7-10

---

## 1. Status

**GAP-29: OPEN — ASSETS NOT DELIVERED — PHASE B BLOCKED**

This document resolves every decision that can be established from existing repository/prototype evidence, and clearly identifies every decision that still requires explicit product/design authority. No SVG paths were invented. No production files were modified. No Phase B implementation occurred.

---

## 2. Authority

| Source | Role |
|--------|------|
| `docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` §14 | Canonical iconography specification (style, weight, grid, colour) |
| `docs/interface/POST-UX-19-PRODUCTION-GAP-INVENTORY.md` §GAP-29 | GAP description, UX authority reference, file impact list |
| `docs/interface/BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md` Phase B | Phase scope: "Replace nav button icons with `<use xlink:href="#icon-*">` references" |
| `docs/interface/prototype/apex-command-prototype.html` lines 1153–1195 | 5 icon path designs conforming to UX-05 §14 spec |
| `tests/rx-07-p1.test.js` P7-10 | Establishes `ds-icon-sprite` as the sprite container ID |
| `public/dashboard.html` lines 12640–12730 | Live nav button inventory (read-only) |
| `public/dashboard.html` lines 269–8622 | CSS nav-icon sizing chain (read-only) |
| `public/dashboard.html` line 338 | `#nav-more { display: none !important; }` (desktop media query, read-only) |

**Note on GAP inventory UX authority reference:** The gap inventory cites "UX-05 §8." The current UX-05 §8 is "Design Token Architecture" (not iconography). §14 is "Iconography." The §8 citation is a stale section reference from an earlier draft. §14 is the authoritative iconography section.

---

## 3. Six-Decision Resolution Matrix

| # | Decision | Resolution | Basis |
|---|----------|------------|-------|
| 1 | Exact icon paths for 20 nav buttons | **PARTIALLY RESOLVED + REQUIRES ASSET DELIVERY** | 3 prototype paths confirmed; 2 candidate paths require explicit decision; 15 require fresh design |
| 2 | `href` vs `xlink:href` for `<use>` | **REQUIRES EXPLICIT PRODUCT/DESIGN DECISION** | Reconnaissance specifies `xlink:href`; dashboard and prototype have zero `xlink` usage; `xlink:href` is deprecated SVG 2.0 — contradiction requires explicit resolution |
| 3 | Sprite file location (inline vs external) | **REQUIRES EXPLICIT PRODUCT/DESIGN DECISION** | Gap inventory implies external file; reconnaissance Phase B file table lists only `dashboard.html`; sources conflict |
| 4 | Symbol ID naming convention | **RESOLVED BY EXISTING AUTHORITY** | `icon-{page-name}` where `{page-name}` matches `pages[]` array exactly; `ds-icon-sprite` container ID from test P7-10 |
| 5 | `nav-more` button scope | **RESOLVED BY EXISTING AUTHORITY** | EXCLUDED — permanently hidden by inline `style="display:none"` and desktop CSS `!important` at line 338; function is mobile overflow toggle, not page navigation; absent from `pages[]` |
| 6 | CSS sizing winner for nav-icon | **PARTIALLY RESOLVED** | `.nav-icon` container width = **18px** (established by both `!important` declarations at lines 6578 and 7921 which agree); SVG element explicit sizing is a Phase B implementation detail, not a design decision |

---

## 4. Canonical 20-Icon Inventory

| # | Nav button ID | Current glyph | Phase D fate | Prototype path | Path authoritative? | Requires design? | Status |
|---|--------------|--------------|-------------|---------------|-------------------|-----------------|--------|
| 1 | `nav-command` | ⬡ | Survives (Command surface) | YES — star polygon | DESIGN CANDIDATE | No | **READY IF OPERATOR APPROVES PROTOTYPE** |
| 2 | `nav-overview` | ◈ | World surface candidate | CANDIDATE — World globe | Mapping ambiguous | No if globe approved | **REQUIRES DECISION: globe or new design?** |
| 3 | `nav-operation` | ⊞ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 4 | `nav-system` | ◉ | Survives (System surface) | YES — terminal/server | DESIGN CANDIDATE | No | **READY IF OPERATOR APPROVES PROTOTYPE** |
| 5 | `nav-finance` | ◎ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 6 | `nav-communication` | ✉ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 7 | `nav-business` | ◧ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 8 | `nav-health` | ◑ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 9 | `nav-university` | ◫ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 10 | `nav-occult` | ◬ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 11 | `nav-research` | ◈ | World/Knowledge (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 12 | `nav-civilisation` | ⊛ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 13 | `nav-reality` | ◍ | World surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 14 | `nav-activity` | ◎ | Decisions surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 15 | `nav-agents` | ◈ | Decisions surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 16 | `nav-approvals` | ◇ | Decisions surface (Phase E retirement) | CANDIDATE — Decisions stack | Semantic mismatch: "Decisions" ≠ "Approvals" | No if stack approved | **REQUIRES DECISION: decisions stack or new design?** |
| 17 | `nav-knowledge` | ◆ | Survives (Knowledge surface) | YES — open book | DESIGN CANDIDATE | No | **READY IF OPERATOR APPROVES PROTOTYPE** |
| 18 | `nav-intelligence` | ◇ | Knowledge surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 19 | `nav-memory` | ▣ | System surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |
| 20 | `nav-governance` | ⚖ | System surface (Phase E retirement) | NO | N/A | YES | **REQUIRES ASSET DELIVERY** |

**Summary:**
- **3 icons READY** (prototype paths, pending operator approval): command, knowledge, system
- **2 icons REQUIRE DECISION** (candidate prototype paths with ambiguous mapping): overview, approvals
- **15 icons REQUIRE ASSET DELIVERY** (no paths exist): operation, finance, communication, business, health, university, occult, research, civilisation, reality, activity, agents, intelligence, memory, governance

**Note on duplicate glyphs:** Current nav uses ◈ for overview/research/agents and ◎ for finance/activity and ◇ for approvals/intelligence. Each of these 20 buttons must receive a semantically distinct SVG regardless of the current glyph duplication.

---

## 5. Confirmed Prototype Paths

Source: `docs/interface/prototype/apex-command-prototype.html` lines 1153–1195  
Prototype comment: `"SVG icons: outlined, 18px, currentColor. UX-05 §14. REWORK from emoji."`

The prototype was explicitly created as part of UX work to demonstrate the Phase B icon replacement. All paths conform to the UX-05 §14 technical specification. They are design artefacts, not production code.

**Authority assessment:** These are DESIGN CANDIDATE PATHS — they represent demonstrated design intent, conform exactly to the canonical spec, and were created for the express purpose of replacing emoji. They require operator confirmation before Phase B implementation. They are NOT automatically authoritative without that confirmation.

### Command (`icon-command`)

Maps to: `nav-command` (survives Phase D as Command surface icon)

```svg
<symbol id="icon-command" viewBox="0 0 20 20">
  <polygon points="10,2 12.5,8.5 19,9.5 14.5,14 15.9,20 10,17 4.1,20 5.5,14 1,9.5 7.5,8.5"
           fill="none" stroke="currentColor" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

### Knowledge (`icon-knowledge`)

Maps to: `nav-knowledge` (survives Phase D as Knowledge surface icon)

```svg
<symbol id="icon-knowledge" viewBox="0 0 20 20">
  <path d="M4 3h9a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H4"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4 3v14a2 2 0 0 0 2 2M7 8h7M7 12h5"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

### System (`icon-system`)

Maps to: `nav-system` (survives Phase D as System surface icon)

```svg
<symbol id="icon-system" viewBox="0 0 20 20">
  <rect x="2" y="4" width="16" height="12" rx="2"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 8h8M6 12h5M14 12h1"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="15" cy="8" r="1" fill="currentColor"/>
</symbol>
```

---

## 6. Candidate Paths Requiring Decision

These two icons have paths in the prototype but require explicit product/design confirmation before use, because the semantic mapping is ambiguous.

### Candidate: World Globe for `icon-overview`

Prototype label: "World" (Phase D "World" surface icon — aggregates legacy pages in Phase E)  
Proposed mapping: `nav-overview`  
Prototype path:

```svg
<symbol id="icon-overview" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="8"
          fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M2 10h16M10 2a14 14 0 0 1 0 16M10 2a14 14 0 0 0 0 16"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

**Why decision is required:** The prototype's "World" icon represents the Phase D consolidated surface (aggregating ~10 legacy pages). "Overview" is a different concept (current single page showing governance/pipeline/status). Using a World globe for "Overview" is a semantic stretch that must be explicitly approved or rejected.

### Candidate: Decisions Stack for `icon-approvals`

Prototype label: "Decisions" (Phase D "Decisions" surface icon)  
Proposed mapping: `nav-approvals`  
Prototype path:

```svg
<symbol id="icon-approvals" viewBox="0 0 20 20">
  <path d="M10 2v16M3 7l7-5 7 5M4 10l6 3 6-3M4 14l6 3 6-3"
        fill="none" stroke="currentColor" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round"/>
</symbol>
```

**Why decision is required:** The prototype's "Decisions" icon represents the Phase D surface that aggregates activity, agents, and approvals. "Approvals" is a narrower concept (pending approval actions). The semantic fit is imprecise. More importantly, this would leave Phase D needing to create a `icon-decisions` symbol for the same concept, potentially creating naming duplication. Requires explicit approval or rejection.

---

## 7. Missing Assets Requiring Design/Delivery

15 icons have no existing SVG paths in any authoritative repository document. These require fresh design work conforming to the UX-05 §14 specification.

| Symbol ID | Nav label | Semantic concept | Phase D fate |
|-----------|-----------|-----------------|-------------|
| `icon-operation` | Operation | Tasks, agents, scheduling | World surface |
| `icon-finance` | Finance | Budgets, investing, planning | World surface |
| `icon-communication` | Network | Messages, contacts, comms | World surface |
| `icon-business` | Business | Ideas, projects, Shopify | World surface |
| `icon-health` | Health | Health, habits, wellbeing | World surface |
| `icon-university` | University | Coursework, revision, notes | World surface |
| `icon-occult` | Occult | Research, esoteric, archive | World surface |
| `icon-research` | Research | Intelligence, sources, data | World/Knowledge surface |
| `icon-civilisation` | Civilisation | Genome, consensus, clock, domains | World surface |
| `icon-reality` | Reality | Fabric, claims, epistemic | World surface |
| `icon-activity` | Activity | Events, observability, live feed | Decisions surface |
| `icon-agents` | Agents | Status, tasks, authority, runs | Decisions surface |
| `icon-intelligence` | Intel | Briefing, opportunities, health | Knowledge surface |
| `icon-memory` | Memory | Episodic, semantic, health | System surface |
| `icon-governance` | Govern | Constitutional, authority, records | System surface |

**Designer note:** UX-05 §14 specifies `viewBox="0 0 20 20"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `stroke="currentColor"`. All 15 icons must conform. No external icon library may be referenced (UX-05 §14.6 PROTECT).

**Phase D consideration:** 15 of these 20 buttons are scheduled for retirement in Phase E. The designer may choose to create minimal/generic icons for Phase-E-retirement pages and invest more effort in the 3 surviving icons (command, knowledge, system). This is a product decision.

---

## 8. Technical SVG Contract

The following attributes are **ESTABLISHED BY AUTHORITY** (UX-05 §14.1, prototype conformance):

| Attribute | Value | Source |
|-----------|-------|--------|
| `viewBox` | `0 0 20 20` | UX-05 §14.1 "Grid: 20×20px"; prototype |
| `stroke` | `currentColor` | UX-05 §14.1 "Colour: inherits via currentColor"; prototype |
| `stroke-width` | `1.5` | UX-05 §14.1 "Stroke weight: 1.5px at 20px nominal size"; prototype |
| `stroke-linecap` | `round` | UX-05 §14.1 "Rounded joins and caps"; prototype |
| `stroke-linejoin` | `round` | UX-05 §14.1 "Rounded joins"; prototype |
| `fill` | `none` (default; `currentColor` on intentional accent fills only) | UX-05 §14.1 "Outlined"; prototype |
| Rendered render size | 18px (matches `--apex-icon-md`) | UX-05 §14.2; `.nav-icon { width: 18px !important; }` at lines 6578 and 7921 |
| Icon with adjacent label | `aria-hidden="true"` on icon SVG | UX-05 §14.5 |
| External icon library | PROHIBITED | UX-05 §14.6 PROTECT |

**Semantic state colours** (CSS-driven, not SVG attributes):
- Default: `currentColor` at nav text colour
- Hover: `currentColor` inheriting brightened parent (CSS handles)
- Active: Primary colour (`var(--primary)`, `var(--cyan)`, or domain colour if `data-page` attribute present — see lines 8078–8082 domain colour overrides)

**CSS sizing note (Phase B implementation detail, not a design decision):**
The `.nav-icon` container is 18px wide (`!important` at lines 6578 and 7921). No existing CSS rule sets `width` or `height` on `.nav-btn svg` (line 7169 sets only `filter: none`). Phase B must add a CSS rule or HTML attributes to size the SVG element: `width: 18px; height: 18px; display: block;` — this is a technical implementation task, not a design choice.

---

## 9. Sprite Architecture Decision

### Sprite container ID
**RESOLVED BY EXISTING AUTHORITY:** `id="ds-icon-sprite"` — established by `tests/rx-07-p1.test.js` P7-10:
```js
assert.ok(!dash.includes('ds-icon-sprite'), 'GAP-29 SVG sprite absent (blocked — assets required)');
```
When Phase B is implemented, this test assertion must be inverted (sprite now present). This is a Phase B regression suite requirement.

### Symbol ID convention
**RESOLVED BY EXISTING AUTHORITY:** `icon-{page-name}` where `{page-name}` exactly matches entries in the `pages[]` array (line 12736 of `dashboard.html`):
```js
['command', 'overview', 'operation', 'system', 'finance', 'communication',
 'business', 'health', 'university', 'occult', 'research', 'civilisation',
 'reality', 'activity', 'agents', 'approvals', 'knowledge', 'intelligence',
 'memory', 'governance']
```
Evidence: reconnaissance Phase B description uses `icon-*` glob; `pages[]` provides the exact name values; no alternative naming is used or suggested anywhere.

### Sprite file location
**REQUIRES EXPLICIT PRODUCT/DESIGN DECISION.**

Conflicting evidence:
- `POST-UX-19-PRODUCTION-GAP-INVENTORY.md` lists `"public/dashboard.html + SVG asset files"` for GAP-29 — implies an EXTERNAL file
- `BETA-LEGACY-INTERFACE-CONVERGENCE-RECONNAISSANCE.md` Phase B files table lists only `public/dashboard.html` for Phase B changes — implies INLINE
- No explicit specification in UX-05 §14

**Options:**
- **Inline**: Sprite placed inside `dashboard.html` `<body>`. No new file required. Simplest. Consistent with how existing inline SVGs are managed.
- **External**: Sprite placed at e.g. `/public/icons.svg`. New file required. Avoids further growth of the 22K-line `dashboard.html`. Requires browser to load a second file (can be served with cache headers).

This decision must be made explicitly before Phase B implementation.

### `href` vs `xlink:href`
**REQUIRES EXPLICIT PRODUCT/DESIGN DECISION.**

| Evidence point | Value |
|---------------|-------|
| Reconnaissance Phase B description | `xlink:href` (explicit) |
| `public/dashboard.html` xlink usage | ZERO — no `xlink:href` anywhere in the file |
| Prototype `<use>` element usage | ZERO — prototype uses inline SVG, not sprite references |
| `xmlns:xlink` namespace declaration | ABSENT from dashboard.html |
| SVG 2.0 specification status | `xlink:href` DEPRECATED in favour of `href` |

**Contradiction:** The reconnaissance specifies `xlink:href` by name, but the codebase has zero prior `xlink` usage and no `xmlns:xlink` namespace declaration. Using `xlink:href` without the namespace declaration will cause silent failure in strict XML parsers.

**Technical risk if `xlink:href` is implemented:** Each `<svg>` element using `<use xlink:href="...">` requires `xmlns:xlink="http://www.w3.org/1999/xlink"` on the element or an ancestor (typically `<html>` or `<svg>`). Adding this namespace is non-trivial for an HTML5 document where `xmlns:xlink` is typically unnecessary.

**Technical recommendation (not a decision):** `href` is the correct modern attribute. All browsers released after 2016 support `href` on `<use>`. The reconnaissance's `xlink:href` phrasing appears to be a documentation convention (older SVG notation), not a technical requirement. However, the existing authority says `xlink:href`, so this must be explicitly resolved before implementation.

---

## 10. Phase B Dependency Determination

### Can Phase B be partially authorised using only the 3 confirmed icons?

**Answer: NO — partial Phase B does not close GAP-29 per authoritative scope.**

Evidence:
- GAP-29 description (gap inventory): "UX-05 §8 specifies inline SVG or an SVG sprite for **all** nav and UI chrome icons" (emphasis: all)
- UX-05 §14.3: "Emoji nav icons | REPLACE | Replace with outlined SVG icons" — applies to all emoji nav icons
- Phase B step 5: "Replace nav button icons" — "nav button icons" refers to all `.nav-icon` spans in the nav, not a subset
- UX-05 G-IG-03: "Emoji are not used as UI icons under any circumstances" — a blanket rule, not a per-icon rule

A partial Phase B (3 icons converted, 17 remaining as emoji) would:
1. Not satisfy GAP-29 (emoji still in use for 17 of 20 buttons)
2. Create a mixed icon system (some SVG, some emoji) that violates G-IG-03
3. Require a second Phase B pass when remaining assets arrive

**The authoritative scope requires full 20-icon replacement for GAP-29 closure.**

**Whether to accept a partial Phase B as an intermediate state** is a PRODUCT DECISION that the operator must make explicitly if desired. It is not implied or authorised by existing documents.

### Does Phase B depend on A-3 / GAP-27?

**No dependency exists.** Phase B (SVG icon replacement in nav buttons) and GAP-27 (CSS `:root` palette consolidation) operate on different parts of the codebase. Phase B touches `.nav-icon` span content and adds sprite symbols. GAP-27 touches CSS custom property definitions. They do not interact.

---

## 11. Exact Asset-Delivery Requirements

**To unblock Phase B, ALL of the following must be delivered:**

### Required SVG paths (15 fresh designs needed)

Each design must conform to the technical contract in Section 8:
- `viewBox="0 0 20 20"`
- `stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`
- `fill="none"` (with intentional accent fills using `fill="currentColor"` only where explicitly chosen)

Designs needed for: `icon-operation`, `icon-finance`, `icon-communication`, `icon-business`, `icon-health`, `icon-university`, `icon-occult`, `icon-research`, `icon-civilisation`, `icon-reality`, `icon-activity`, `icon-agents`, `icon-intelligence`, `icon-memory`, `icon-governance`.

### Required explicit decisions (before implementation can begin)

| Decision | Options |
|----------|---------|
| `icon-overview` | Approve World globe path from prototype, OR provide a different path |
| `icon-approvals` | Approve Decisions stack path from prototype, OR provide a different path |
| `icon-command` | Approve star polygon from prototype, OR provide a different path |
| `icon-knowledge` | Approve open book from prototype, OR provide a different path |
| `icon-system` | Approve terminal/server from prototype, OR provide a different path |
| `href` vs `xlink:href` | Choose one; note that `href` is correct for modern browsers |
| Sprite file location | Inline in `dashboard.html` OR external file (with path specified) |

### Delivery format options

Assets may be delivered as any of:
- SVG path strings with symbol IDs (copy-paste ready)
- An SVG file with `<symbol>` elements pre-structured
- An explicit "approve prototype path" instruction per icon (for the 3 confirmed + 2 candidate prototype icons)

---

## 12. GAP-27 Separation

**GAP-27 remains completely separate from GAP-29. No GAP-27 work was performed during this reconnaissance.**

| Item | Status |
|------|--------|
| GAP-27 (CSS `:root` consolidation) | BLOCKED — per-block consolidation targets not specified; explicitly deferred |
| GAP-27 touched during this reconnaissance | NO |
| GAP-27 targets inferred | NO |
| GAP-27 affecting Phase B | NO — they operate on independent parts of the codebase |

---

## 13. Explicit Unresolved Decisions

The following items cannot be resolved from existing repository evidence and require explicit operator/designer input:

| # | Decision | Why unresolved |
|---|----------|---------------|
| A | `icon-overview` path | World globe (prototype) maps to Phase D surface, not directly to current Overview concept; explicit mapping approval required |
| B | `icon-approvals` path | Decisions stack (prototype) maps to Phase D surface concept, semantically distinct from "Approvals"; approval or rejection required |
| C | `icon-command` approval | Prototype star polygon — authoritative as design candidate; requires explicit operator confirmation for production use |
| D | `icon-knowledge` approval | Prototype book — authoritative as design candidate; requires explicit operator confirmation |
| E | `icon-system` approval | Prototype terminal/server — authoritative as design candidate; requires explicit operator confirmation |
| F | 15 icon paths | No paths exist in any authoritative source; fresh design required |
| G | `href` vs `xlink:href` | Reconnaissance says `xlink:href`; codebase has zero `xlink` usage; deprecated; requires explicit resolution |
| H | Sprite file location | Gap inventory implies external file; reconnaissance Phase B files table lists only `dashboard.html`; sources conflict; requires explicit decision |

---

## 14. Authorisation Boundary

**Phase B remains blocked.** This document does NOT authorise Phase B. Phase B requires:

1. A separate explicit Phase B implementation authorisation message
2. Delivered alongside or accompanied by resolved decisions A–H from Section 13
3. Delivered alongside the 15 SVG path definitions from Section 11

When those are delivered, Phase B can proceed. The technical contract (Section 8), sprite structure (Section 9), symbol ID convention (Section 4/9), nav-more exclusion (Section 3), and CSS implementation approach are ready — implementation can begin immediately upon asset and decision delivery.

---

## 15. Final Hard Stop

**No SVG files were created during this reconnaissance.**  
**No production files were modified.**  
**GAP-27 was not approached.**  
**Phase B was not implemented.**  
**Phases C, D, E, F were not approached.**

---

## Resolved vs Unresolved Summary

**DEFINITIVELY RESOLVED (can be implemented immediately):**
- Symbol ID convention: `icon-{page-name}` matching `pages[]` entries
- Sprite container ID: `ds-icon-sprite`
- `nav-more` scope: EXCLUDED (permanently hidden, not a page button)
- `.nav-icon` container width: 18px (established by two competing `!important` CSS declarations that agree)
- SVG technical contract: viewBox 20×20, stroke 1.5px, currentColor, round caps/joins, fill none
- Accessibility pattern: `aria-hidden="true"` on icon SVG when adjacent to label text
- External icon library: PROHIBITED (UX-05 §14.6 PROTECT, no deviation allowed)
- `tests/rx-07-p1.test.js` P7-10: must be inverted when Phase B is implemented

**REQUIRES EXPLICIT PRODUCT/DESIGN DECISION:**
- Whether to approve 3 prototype paths (command, knowledge, system) for production
- Whether to approve 2 candidate prototype paths (overview ← World globe, approvals ← Decisions stack)
- `href` vs `xlink:href` attribute for `<use>` elements
- Sprite file location: inline in `dashboard.html` vs external `/public/icons.svg`
- Whether partial Phase B (fewer than 20 icons) is acceptable as an intermediate state

**REQUIRES ASSET DELIVERY (15 icons, no paths exist):**
operation, finance, communication, business, health, university, occult, research, civilisation, reality, activity, agents, intelligence, memory, governance

**PHASE B STATUS: BLOCKED — AWAITING ASSET DELIVERY AND DECISION RESOLUTION**
