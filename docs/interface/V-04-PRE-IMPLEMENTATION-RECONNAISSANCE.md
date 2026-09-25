# V-04 PRE-IMPLEMENTATION RECONNAISSANCE

**Date:** 2026-08-31  
**Authority:** APEX Visual/Product Overhaul — V-04 Authorization  
**Phase:** V-04A — Forensic Reconnaissance (read-only)  
**Status:** RECONNAISSANCE COMPLETE — Hard stop, pending V-04B–J authorization  
**Baseline:** V-03 certified — `public/apex-zero.css` is the canonical design authority  
**Tools used:** Playwright (1440px), dashboard.html agent scan, grep

---

## 1. Scope

V-04A is a forensic inventory of all remaining visual and semantic debt after V-03. No code was modified during reconnaissance. This document is the complete deliverable for V-04A. Implementation begins at V-04B — only after explicit authorization.

---

## 2. Event Taxonomy — P0-01 Status

### Root Cause (confirmed)

`apexFeedPush(tag, msg, type)` is defined at dashboard.html line **17997**.

The 6 active type values used across dashboard.html:

| Type | Usage | Line(s) |
|------|-------|---------|
| `'system'` | Startup message | ~18103 |
| `'voice'` | User chat / voice input | ~18113 |
| `'research'` | Research results (success) | ~18210, 18221 |
| `'error'` | Latency >800ms, research failures, file errors | ~18076, various |
| `'file'` | File operations | ~18296, 18318 |
| `'agent'` | Agent polling/activity | ~18349 |

### The Problem

Latency telemetry ("Slow response — Xms") is emitted at line ~18076 via `type: 'error'` when response time exceeds 800ms. This is the **sole source** of the feed flooding observed in local dev. The backend has no `type: 'telemetry'` or `type: 'perf'` channel.

### Playwright Confirmation

In local dev at 1440px, 100% of visible feed entries were `apex-tag-error` labelled "Slow response — Xms". Zero genuine errors, zero system/voice/research/agent entries rendered during the test window. This is full P0-01 confirmation: the feed is unusable as a user-activity monitor when latency events are present.

### V-04B Resolution Path

Minimal patch at line ~18076: change `type: 'error'` → `type: 'telemetry'` for the latency branch. Then apex-zero.css Section 22 can target `.apex-tag-telemetry` with `opacity: 0.25` (lowest tier), separating perf diagnostics from real errors.

No new backend type needs to be invented — `'telemetry'` is additive to the existing `apexFeedPush` call signature.

---

## 3. Typography — JetBrains Mono Misuse Inventory

JetBrains Mono should appear **only on numeric/statistical data values** per the V-03 type scale. The following elements still use JetBrains Mono on non-numeric content:

| Selector / Element | Content | Location |
|-------------------|---------|----------|
| `.clock-time` | Current time display (e.g., "14:32") | Command Centre topbar |
| `.help-key` | Keyboard shortcut labels (e.g., "⌘K") | Help overlay |
| Orb label (inline) | "STANDBY · TAP TO SPEAK" | PlasmaOrb section |
| `.cmd-cl-meta` | Command history metadata | Command Centre |
| `.streak` | Streak counter label | Stat area |
| `.sub` | Various subtitle/sublabel text | Multiple pages |

Time display (`.clock-time`) is borderline — numeric content, acceptable case for mono if intentional. All others are labels/text that should use Inter.

**V-04 fix:** CSS overrides in apex-zero.css Section 20 (typography) targeting each selector with `font-family: var(--font-sans) !important`.

---

## 4. Legacy Color Inventory

### Hardcoded Colors Still Active (post V-03)

#### `#0d1424` (legacy navy — should be `--void-1`)

| Location | Occurrence Type |
|----------|----------------|
| `#page-command` | Inline `style=` on panel backgrounds |
| `#page-communication` | 5 inline `style=` attributes on section panels |
| `#page-operation` | Inline `style=` on panels |
| Constitution section | Partially overridden by apex-zero.css Section 21; residual remains |

#### `#00d4ff` (legacy cyan — should be `--signal` indigo)

| Location | Occurrence Type |
|----------|----------------|
| Global (css vars) | `--accent: #00d4ff` in B6 :root block — overridden by apex-zero.css `!important` at :root level |
| `#page-command` | Inline element styles |
| `#page-system` | Inline element styles |
| `#page-finance` | Inline element styles (gradient blues) |
| `#page-operation` | Inline element styles |
| `#page-agents` | Inline element styles |
| `#page-approvals` | Inline element styles |

#### `#5b9eff` (legacy blue — domain accent, partially legitimate via B4)

| Location | Occurrence Type |
|----------|----------------|
| `#page-command` | Inline element styles |
| `#page-communication` | Multiple inline `style=` attributes |
| `#page-operation` | Inline element styles |
| `#page-overview` | Inline element styles |

**Note:** `#5b9eff` appears as `--ax-sys: #5b9eff` in B4 (domain color block at line 5374). This is a **legitimate domain semantic color** for System domain. Inline uses that should be `var(--ax-sys)` are the issue, not the token itself.

### Domain Pages by Migration Urgency

| Page | Severity | Notes |
|------|----------|-------|
| Communication | High | 5× `#0d1424` + multiple `#5b9eff` inline — most dense |
| Finance | Medium | `linear-gradient` blues, `#00d4ff` inline |
| Operation | Medium | Mixed `#0d1424` + `#5b9eff` + `#00d4ff` |
| Command | Medium | Partially covered by apex-zero.css Section 21 |
| Agents | Low | `#00d4ff` inline only |
| Approvals | Low | `#00d4ff` inline only |
| Health | Low | Already var()-compliant for most |
| Business | Low | Already var()-compliant for most |
| University | Low | Already var()-compliant for most |

---

## 5. CSS :root Block Inventory

### Source Blocks (dashboard.html — 7 identified by agent scan)

| ID | Location (approx line) | Authority | Key tokens | Status |
|----|------------------------|-----------|-----------|--------|
| B1 | ~100 | Lifted blue-slate palette | Old --bg, --surface navy | Superseded by apex-zero.css |
| B4 | ~5374 | Domain color system | `--ax-sys`, `--ax-fin`, `--ax-uni`, `--ax-biz`, `--ax-occ` | **KEEP — semantic domain colors** |
| B5 | ~5900 | v12 bridge | Mixed tokens | Superseded |
| B6 | ~3646 | **Jarvis (canonical)** | `--font-sans`, `--font-mono`, `--topbar-h: 48px`, `--sidebar-w: 200px`, all `!important` | **DOMINANT — must not break** |
| B7 | ~200 | v11 legacy | Early palette | Superseded |
| FD-11 | ~6000 | apex-color-* namespace | Scoped domain accent colors | Partially active |
| Standalone | ~6100 | `color-scheme: dark` only | Single property | Harmless |

**Browser reports 10 :root blocks** — discrepancy of 3 vs source likely due to injected content (service worker, extension) or conditional script blocks. Harmless — apex-zero.css wins cascade.

### V-04G Consolidation Approach

Blocks to preserve: **B4** (domain colors) and **B6** (Jarvis — `--topbar-h`, `--sidebar-w`, `--font-*`).  
Blocks to classify as redundant: B1, B5, B7, FD-11 (tokens overridden by apex-zero.css or B6).

**Risk:** B6 uses `!important` on all tokens — touching it requires careful cascade analysis. V-04G should be last in the implementation sequence.

---

## 6. Empty State Patterns — Current State

### CSS (defined in V-03)

```css
.ds-empty, .apex-empty  — flex column, centred, --on-void-3, Inter 12px, min-height 80px
```

### HTML patterns actually in use (no unified component)

| Class | Found in | Behaviour |
|-------|----------|-----------|
| `.apex-res-loading` | Research page | Shows "Loading…" inline |
| `.empty-note` | Knowledge, Memory pages | Freeform empty text |
| `.apex-res-error` | Research page | Error display inline |
| Inline text ("Loading…", "Checking…") | Multiple stat cards | No class |
| `display:none` hiding | Multiple domain pages | Hidden before data loads — no loading state |

**Gap:** No page uses `.ds-empty` or `.apex-empty`. The CSS foundation (V-03) is in place; HTML adoption has zero coverage.

**V-04E scope:** Identify the 3–5 highest-value empty states (activity feed, stat strip, research results, agents list) and adopt `.ds-empty` pattern. Full sweep of all 20 pages is V-05+.

---

## 7. Command Centre — Current State

### Visual Hierarchy (V-03 state, 1440px)

| Element | Status |
|---------|--------|
| PlasmaOrb (200px) | Correctly centred, functional state indicator |
| Stat strip (4 cards) | Present, all showing "—" in local dev |
| Activity feed (right column) | Present, flooded with "Slow response" entries (P0-01) |
| Command input | Styled correctly, Inter 14px |
| Constitution section | Partially migrated (V-03 Section 21); some `#0d1424` residual |

### V-04H Evaluation

The Command Centre layout functions correctly. The primary UX problem is the feed flooding (P0-01 — addressed by V-04B). No structural change is needed for V-04. Evaluation: **RETAIN current layout, fix data.**

---

## 8. WebSocket and Backend Feed Sources

Three WebSocket handlers found in dashboard.html — **none push to `apexFeedPush`:**

| Line | Handler | Feed impact |
|------|---------|------------|
| ~8828 | WS message handler | Updates state objects, no feed push |
| ~10694 | Agent status handler | Updates agent UI, no feed push |
| ~19185 | Notification handler | Notification UI, no feed push |

All feed entries originate from `apexFeedPush` call sites only. No hidden feed sources.

---

## 9. V-04 Implementation Plan (pending authorization)

### Sequence

| Sub-phase | Task | Risk | Files |
|-----------|------|------|-------|
| V-04B | Event taxonomy: change latency branch `type:'error'` → `type:'telemetry'` | Low — 1-line JS patch | dashboard.html ~18076 |
| V-04C | Activity feed CSS: add `.apex-tag-telemetry` tier (opacity 0.25); promote `.apex-tag-error` to real-error treatment | Low — CSS only | apex-zero.css |
| V-04D | Data integrity verification (stat cards, feed in prod context) | None — read-only | Playwright |
| V-04E | Empty state HTML: adopt `.ds-empty` on activity feed, stat strip, research | Medium — HTML changes | dashboard.html |
| V-04F | Domain page token migration: Communication (priority 1), Finance, Operation | Medium — inline style removal | dashboard.html |
| V-04G | Legacy :root consolidation: classify B1/B5/B7/FD-11 as redundant; do NOT touch B4 or B6 | High — cascade risk | dashboard.html |
| V-04H | Command Centre re-evaluation post-feed-fix | Low — assess only | — |
| V-04I | Browser verification: 10 viewports | None — read-only | Playwright |
| V-04J | Functional regression: 20/20 navigation, login, chat input | None — read-only | Playwright |

### Hard Protection Rules (carry forward from V-02/V-03)

- apex-zero.css remains the sole canonical design system file
- No new competing `:root` blocks
- No backend route changes, no server.js changes
- No production deploy until user authorizes
- B4 domain color tokens preserved as-is
- B6 Jarvis block untouched unless V-04G is explicitly authorized

---

## 10. Remaining Visual Debt Summary

| Item | Severity | Phase |
|------|----------|-------|
| P0-01: Latency telemetry emitted as `type:'error'` | **Critical** | V-04B |
| JetBrains Mono on non-numeric labels (6 selectors) | High | V-04C |
| Communication page inline navy/blue (5+ occurrences) | High | V-04F |
| Finance page gradient blues | Medium | V-04F |
| Operation page mixed legacy colors | Medium | V-04F |
| Empty state HTML adoption (0% coverage of `.ds-empty`) | Medium | V-04E |
| Legacy :root block consolidation (B1, B5, B7, FD-11) | Low | V-04G |
| `ds-btn.xs` / `ds-btn.btn--xs` font-size not unified to 11px | Low | V-04C |
| Domain chart/table tokens (Chart.js theming) | Low | V-05+ |
| Header hierarchy within domain pages | Low | V-05+ |
| PlasmaOrb data-driven state (beyond 4 voice states) | Deferred | V-05+ |

---

**V-04A RECONNAISSANCE COMPLETE**

*Reconnaissance recorded: 2026-08-31*  
*No code modified during V-04A*  
*Baseline: V-03 certified — apex-zero.css ~540 lines, 13.1KB*  
*Awaiting V-04B–J authorization before implementation*
