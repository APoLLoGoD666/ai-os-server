# RX-04 — FRONTEND SURFACES CLOSURE

**Status:** COMPLETE  
**Date:** 2026-08-28  
**Scope:** GAP-05 (Domain Token Application), GAP-09 (Agent Capability Matrix), GAP-14 (Memory Inspection, Read-Only)  
**Only file modified:** `public/dashboard.html`  
**One-Apex integrity:** MAINTAINED

---

## GAP-05 — Domain Token Application (UX-10)

**Class:** A (Frontend-only)  
**Priority:** P2

### Implementation

Added a CSS block immediately after the UX-05 canonical token namespace block (`@media prefers-reduced-motion` close):

```css
/* UX-10 DOMAIN TOKEN APPLICATION — RX-04 GAP-05 */
#page-finance,
#page-health,
#page-business,
#page-university,
#page-communication {
    --domain-primary:    var(--apex-color-primary);
    --domain-bg:         var(--apex-color-bg);
    --domain-bg-2:       var(--apex-color-bg-2);
    --domain-surface:    var(--apex-color-surface-1);
    --domain-border:     var(--apex-color-border);
    --domain-border-dim: var(--apex-color-border-dim);
    --domain-text:       var(--apex-color-text-primary);
    --domain-text-muted: var(--apex-color-text-muted);
    --domain-success:    var(--apex-color-success);
    --domain-warning:    var(--apex-color-warning);
    --domain-danger:     var(--apex-color-danger);
}
#page-finance .ds-panel,
#page-health .ds-panel,
#page-business .ds-panel,
#page-university .ds-panel,
#page-communication .ds-panel {
    background:   var(--apex-color-surface-1);
    border-color: var(--apex-color-border);
}
```

### Verification

- All five domain page containers (`#page-finance`, `#page-health`, `#page-business`, `#page-university`, `#page-communication`) targeted
- `--apex-color-*` tokens referenced by the domain CSS block (11 tokens wired)
- `.ds-panel` within domain pages wired to `--apex-color-surface-1` and `--apex-color-border`
- Zero existing domain CSS removed — additive only
- All five domain page divs verified present

---

## GAP-14 — Memory Inspection Panel, Read-Only First Pass (UX-15)

**Class:** B/C hybrid (API consumer wiring against namespaced routes)  
**Priority:** P2

### Implementation

#### Registration
- Added `'memory'` to `pages` array
- Added `pageMeta.memory: { title:'Memory', sub:'Episodic · Semantic · Health' }`
- Added desktop nav button `#nav-memory` with ▣ icon
- Added mobile nav button: `data-args='["memory"]'` → MEMORY

#### HTML
Added `#page-memory` div between `#page-intelligence` and `.page-wrap` close, containing:
1. **Memory Health panel** (`memHealthPanel`) — calls `GET /api/memory/health`
2. **Recent Episodes panel** (`memEpisodicList`) — calls `GET /api/memory/episodic/recent`
3. **Semantic Facts panel** (`memSemanticList`) — calls `GET /api/memory/semantic/search` with live search input (`memSemanticSearch`)
4. **Read-only boundary note** — explicitly states correction/deletion unavailable

#### JS Functions
- `_loadMemoryHealth()` — fetches `/api/memory/health`, renders episodic/consolidation/reflexion/improvement counts
- `_loadMemoryEpisodic()` — fetches `/api/memory/episodic/recent`, renders episode list with success badge
- `_loadMemorySemantic(q)` — fetches `/api/memory/semantic/search`, supports live search query
- `memoryRefresh()` — calls all three loaders; `window.memoryRefresh` exposed
- `memorySearch()` — reads `memSemanticSearch.value`, calls `_loadMemorySemantic(q)`; `window.memorySearch` exposed
- Page switch hook: `if (name === 'memory') { memoryRefresh(); }`

#### Auth
All fetch calls use `_h()` → `buildApiHeaders()` (existing canonical pattern).

### Note: No GET /api/memory aggregator

The planning document stated "GET /api/memory is confirmed available." Reconnaissance found this to be incorrect — no such root endpoint exists. Three namespaced routes were used instead, which are all confirmed production endpoints from `routes/memory.js`. The read-only panel is fully functional using these routes.

### Read-Only Boundary

No correction or deletion controls are present. The page explicitly notes:
> "Correction and deletion of memory records are not yet available in this interface. This view is inspection-only."

GAP-15 (correction) and GAP-16 (deletion) remain OPEN and unscheduled.

---

## GAP-09 — Agent Capability/Authority Matrix (UX-13 §4)

**Class:** B (API consumer wiring)  
**Priority:** P2

### Implementation

#### HTML
Added a "Domain Agent Capabilities" `ds-panel` inside `#page-agents`, before the existing authority note:
- Panel ID: `agentCapList` (list), `agentCapCount` (count display)
- Renders per-agent: initial letter avatar, name, category (as capability scope proxy), description

#### JS
- `_loadAgentCapabilities()` — calls `GET /api/agents/domain`, renders agent grid
- `agentsRefresh()` extended to include `_loadAgentCapabilities()` call

#### No fabricated fields
- No `capability_scope` or `authority_boundary` per-agent fields were invented
- Capability is represented accurately as: category + description (both confirmed in API response)
- Authority boundary: the existing constitutional note ("Agents propose; you approve. Constitutional gate applies to all execution.") was preserved — it is the correct per-system authority statement

#### Existing elements preserved
- `agentSelfCheck`, `agentRunsList`, `agentStandingList` panels — all intact
- Authority boundary note — preserved verbatim

---

## Deferred Items (Explicitly Not Implemented)

| Item | Status |
|------|--------|
| GAP-28 (IBM Plex Sans / Space Grotesk font removal) | DEFERRED — fonts actively referenced in 29+ CSS locations. Not a safe 2-line removal. |
| GAP-15 (Memory correction route) | OPEN — in canonical RX-03 scope, not implemented. No route exists. |
| GAP-16 (Memory deletion route) | OPEN — in canonical RX-03 scope, not implemented. No route exists. |
| GAP-22 (Historical event log) | OPEN — in canonical RX-03 scope, not implemented. No route exists. |
| RX-05, RX-06, RX-07 | Not started |

---

## Files Modified

| File | Changes |
|------|---------|
| `public/dashboard.html` | +domain token CSS, +page-memory div, +capability panel in page-agents, +nav/mobile nav, +pages array/pageMeta, +JS functions, +switch hooks |

## Files Created

| File | Purpose |
|------|---------|
| `tests/rx-04-p1.test.js` | RX-04 focused test suite (42 assertions) |
| `docs/interface/RX-04-FRONTEND-SURFACES-CLOSURE.md` | This document |
| `docs/interface/RX-04-CERTIFICATION.md` | Certification checklist |

## Files NOT Modified (Confirmed Untouched in RX-04)

- `server.js` — untouched
- `lib/*` — untouched
- `routes/*` — untouched (changes visible in git diff are from RX-02/RX-03)
- `src/routes/*` — untouched (changes from RX-02/RX-03)
- `agent-system/*` — untouched
- Database schema — untouched
