# RX-07 PRE-IMPLEMENTATION RECONNAISSANCE

**Programme:** RX — Production Reconciliation  
**Phase:** RX-07 (not yet started)  
**Reconnaissance Date:** 2026-08-28  
**Status:** COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION

---

## 1. RX-07 Authoritative Objective

RX-07 closes six architectural and UX surface gaps identified during the POST-UX-19 reconciliation pass. All six are classified P3 (design-phase or regression-suite required before implementation). None may be implemented without explicit sprint authorisation.

Source document: `docs/planning/POST-UX-19-R-SERIES-RECONCILIATION.md` lines 222–234.

---

## 2. Authoritative Gap Inventory

| Task | Gap(s) | Classification | Description |
|------|--------|----------------|-------------|
| RX-07-A | GAP-01 | F — architectural workstream | Progressive Disclosure System (L0–L4 levels) |
| RX-07-B | GAP-25 | A — frontend-only | 5-tab persistent bottom navigation |
| RX-07-C | GAP-27 | G — design cleanup | Style consolidation pass |
| RX-07-D | GAP-02, GAP-03, GAP-04 | B — API consumer wiring | Voice notification suppression, deduplication, budget |
| RX-07-E | GAP-24 | A — frontend-only | Bottom sheet component (depends on GAP-01) |
| RX-07-F | GAP-29 | H — structural replacement | SVG icon system replacing emoji |

**GAP-28 status:** Deferred to RX-07 in `docs/interface/RX-04-CERTIFICATION.md`, but NOT listed in `POST-UX-19-R-SERIES-RECONCILIATION.md` as a canonical RX-07 task. GAP-28 (font retirement) is therefore an **unscheduled gap** that requires explicit scheduling before work may begin. See Section 7.

---

## 3. Current Status of Every RX-07 Gap

### GAP-01 — Progressive Disclosure System (L0–L4)

**Status: ABSENT — not implemented.**

No L0–L4 disclosure hierarchy exists in `public/dashboard.html`. The strings "L0", "L1", "L2", "L3", "L4" do appear in the file, but these are constitutional governance record identifiers (runtime/wave labelling), NOT the UX-08 progressive disclosure levels. No `data-level`, `ds-disclosure`, or equivalent mechanism is present. No backend disclosure controller exists.

**Precondition for implementation:** Design phase required. GAP-01 is the foundational dependency for GAP-24 (bottom sheet).

---

### GAP-02 / GAP-03 / GAP-04 — Voice Notification Suppression / Deduplication / Budget

**Status: ALL ABSENT — not implemented.**

- **GAP-02 (suppression):** No suppression logic in any voice-related JS. Duplicate announcements possible.
- **GAP-03 (deduplication):** No dedup queue or hash comparison in `public/dashboard.html` voice path.
- **GAP-04 (budget):** No per-session voice token budget tracking in frontend or backend.

The voice FAB (`.ds-fab`) exists and is functional. The event bus wires correctly. The three notification controls are entirely absent.

**Precondition for implementation:** All three are wiring-only (GAP classification: B). No design phase required, but a regression suite covering existing voice behaviour must be established first.

---

### GAP-24 — Bottom Sheet Component

**Status: ABSENT — not implemented.**

No bottom sheet element, overlay, or slide-up animation exists in `public/dashboard.html`. The mobile nav is a hamburger dropdown (lines 8745–8767, 3-column grid). No `ds-bottom-sheet`, `drawer`, or equivalent component is present.

**Hard dependency:** GAP-01 (L0–L4 progressive disclosure) must be implemented first. GAP-24 cannot be implemented in RX-07 unless GAP-01 is also in scope.

---

### GAP-25 — 5-Tab Persistent Bottom Navigation

**Status: ABSENT — not implemented.**

The current mobile navigation is a hamburger-style dropdown, not a persistent bottom tab bar. No `ds-tab-bar`, fixed-bottom nav strip, or 5-item persistent layout exists.

**Precondition for implementation:** Design phase + mobile regression suite required. Replacing the existing dropdown is a visible, high-risk layout change.

---

### GAP-27 — Style Consolidation Pass

**Status: NOT DONE.**

No consolidation has been applied. CSS custom properties, inline styles, and utility classes remain in their current dispersed state from prior sprints. GAP-27 is a cleanup pass, not a feature addition.

**Precondition for implementation:** Regression suite required. Style changes can silently break layout across all 9 pages.

---

### GAP-29 — SVG Icon System (Replacing Emoji)

**Status: ABSENT — not implemented.**

All navigation buttons and UI affordances use emoji characters (⚖, 📊, 🧠, etc.). No SVG sprite, icon component, or `<svg>` element exists in the dashboard outside of data visualisations.

**Precondition for implementation:** Icon asset delivery required before implementation can begin.

---

## 4. GAP-15 / GAP-16 / GAP-22 Scheduling Status

| Gap | Description | Canonical Sprint | Current Status |
|-----|-------------|-----------------|----------------|
| GAP-15 | Memory correction route (`PATCH /api/memory/:id`) | Originally RX-03 | **UNSCHEDULED** — never executed; not in any sprint |
| GAP-16 | Memory deletion route (`DELETE /api/memory/:id`) | Originally RX-03 | **UNSCHEDULED** — never executed; not in any sprint |
| GAP-22 | Historical event log surface | Originally RX-03 | **UNSCHEDULED** — never executed; not in any sprint |

No RX-03B, RX-08, or successor sprint is defined anywhere in the planning documents. GAP-15/16/22 cannot be implemented until explicitly scheduled and authorised.

---

## 5. GAP-28 Complete Font Audit

**Status: OPEN — unscheduled as a canonical RX-07 task.**

### Fonts to Retire (UX-05 verdict: RETIRE)

| Font | Occurrences in dashboard.html | Location types |
|------|------------------------------|----------------|
| IBM Plex Sans | **29** | CSS custom properties, `font-family` declarations, inline styles |
| Space Grotesk | **214** | CSS rules, inline `style=` attributes, JavaScript string concatenation in `h+=` statements |

### Fonts to Protect (UX-05 verdict: PROTECT — canonical stack)

| Font | Status |
|------|--------|
| Inter | Canonical body font — must replace IBM Plex Sans |
| Cinzel | Canonical display font — already present in Google Fonts `<link>` |
| JetBrains Mono | Canonical mono font — already present in Google Fonts `<link>` |

### Critical Risk: Space Grotesk in JavaScript String Concatenation

Space Grotesk appears inside JavaScript `h+=` string concatenation blocks beginning at approximately line 8926. These are dynamic HTML generators — a find-and-replace will not be sufficient. Each concatenation block must be audited individually to ensure the correct replacement font is applied.

### Google Fonts Link (line 18)

The single `<link>` tag at line 18 loads all four fonts: IBM Plex Sans, Space Grotesk, Cinzel, and JetBrains Mono. After font retirement, the link must be updated to load only Inter, Cinzel, and JetBrains Mono.

### CSP Impact

`middleware/express-config.js` whitelists `fonts.googleapis.com` in the Content Security Policy. The CSP does not need modification — the replacement fonts (Inter) are served from the same Google Fonts CDN.

### Effort Estimate

| Item | Count | Risk |
|------|-------|------|
| IBM Plex Sans CSS/style replacements | 29 | Low — mechanical substitution |
| Space Grotesk CSS/style replacements | ~190 | Medium — mechanical substitution |
| Space Grotesk JS string concatenation | ~24 | High — context-sensitive, requires per-instance review |
| Google Fonts `<link>` update | 1 | Low |

Total: **244 touch points.** This is significantly more complex than the "2-line removal" description in the original GAP-28 planning entry.

---

## 6. Architectural Integrity Checks

### ONE-APEX Constraints — Pre-RX-07 State

| Principle | Status |
|-----------|--------|
| Single production frontend (`public/dashboard.html`) | MAINTAINED |
| No second governance system | MAINTAINED |
| No second constitutional runtime | MAINTAINED |
| No second event bus | MAINTAINED |
| No second memory system | MAINTAINED |
| No architectural duplication from RX-05/RX-06 | CONFIRMED |

### Files Confirmed Unmodified Since Last Authorized Sprint

- `server.js` — unchanged
- `lib/kernel.js` — unchanged
- `lib/governance.js` — unchanged
- `lib/event-bus.js` — RX-05 changes only (correlation_id), no further modifications

---

## 7. Gap Classification for RX-07 Planning

| Gap | Classification | Design Phase? | Regression Suite? | Asset Delivery? | Depends On |
|-----|---------------|--------------|------------------|----------------|------------|
| GAP-01 | F | YES | YES | No | — |
| GAP-02 | B | No | YES | No | — |
| GAP-03 | B | No | YES | No | — |
| GAP-04 | B | No | YES | No | — |
| GAP-24 | A | No | YES | No | GAP-01 |
| GAP-25 | A | YES | YES | No | — |
| GAP-27 | G | No | YES | No | — |
| GAP-28 | G | No | YES | No | — (unscheduled) |
| GAP-29 | H | No | No | YES (SVG assets) | — |

No RX-07 gap can be implemented without a regression suite. GAP-01 and GAP-25 additionally require a design phase. GAP-29 requires SVG icon assets to be delivered before implementation.

---

## 8. GAP-31 Product Decision Status

GAP-31 (Attention Engine frontend wiring) reconnaissance finding:

The Attention Engine backend is active and operational. It is not wired to the frontend. No frontend affordance exists to surface attention signals or priority indicators. GAP-31 appears in planning documents as a product decision pending — the decision of whether and how to surface attention state to the user has not been made. This gap remains a product decision, not an implementation gap.

---

## 9. Discrepancies Surfaced

| Discrepancy | Detail |
|-------------|--------|
| GAP-28 sprint assignment | RX-04 certification defers to RX-07; POST-UX-19 reconciliation document does NOT list GAP-28 as an RX-07 task. GAP-28 is unscheduled pending explicit authorisation. |
| Space Grotesk occurrence count | RX-04 reconnaissance estimated 154 inline references; actual count is 214. GAP-28 scope was materially underestimated. |
| GAP-28 complexity | Planning document describes as "low risk / 2-line removal." Actual scope: 244 touch points including high-risk JS string concatenation. |

---

## 10. Production Files Requiring Modification per RX-07 Gap

| Gap | File(s) |
|-----|---------|
| GAP-01 | `public/dashboard.html`, new `lib/disclosure.js` (TBD in design phase) |
| GAP-02/03/04 | `public/dashboard.html` (voice JS section) |
| GAP-24 | `public/dashboard.html` |
| GAP-25 | `public/dashboard.html` |
| GAP-27 | `public/dashboard.html` |
| GAP-28 | `public/dashboard.html`, `middleware/express-config.js` (Google Fonts link update only) |
| GAP-29 | `public/dashboard.html`, SVG asset files (new) |

No `server.js`, `lib/kernel.js`, `lib/governance.js`, `lib/event-bus.js` modifications anticipated for any canonical RX-07 gap.

---

## 11. Remaining Open Gaps (Full Registry)

| Gap | Description | Sprint | Status |
|-----|-------------|--------|--------|
| GAP-01 | Progressive Disclosure L0-L4 | RX-07-A | Open — design required |
| GAP-02 | Voice notification suppression | RX-07-D | Open — regression suite required |
| GAP-03 | Voice deduplication | RX-07-D | Open — regression suite required |
| GAP-04 | Voice budget | RX-07-D | Open — regression suite required |
| GAP-15 | Memory correction route | Unscheduled | Open — no sprint assigned |
| GAP-16 | Memory deletion route | Unscheduled | Open — no sprint assigned |
| GAP-22 | Historical event log | Unscheduled | Open — no sprint assigned |
| GAP-24 | Bottom sheet | RX-07-E | Open — blocked by GAP-01 |
| GAP-25 | 5-tab bottom nav | RX-07-B | Open — design required |
| GAP-27 | Style consolidation | RX-07-C | Open — regression suite required |
| GAP-28 | Font retirement | Unscheduled | Open — not in canonical RX-07 |
| GAP-29 | SVG icon system | RX-07-F | Open — SVG assets required |
| GAP-31 | Attention Engine frontend | Product decision | Open — decision pending |

---

## 12. Hard Stop Confirmation

**RX-07 PRE-IMPLEMENTATION RECONNAISSANCE COMPLETE.**

No implementation performed. No production files modified. No test files created.

Do not begin RX-07. Do not implement any gap listed above.  
Await explicit authorisation for the next canonical sprint.
