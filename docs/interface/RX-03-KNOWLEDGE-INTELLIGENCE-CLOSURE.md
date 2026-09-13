# RX-03 — KNOWLEDGE + INTELLIGENCE PRODUCTION CLOSURE

**Status:** CLOSED  
**Date:** 2026-08-28  
**Scope:** GAP-06 (Knowledge), GAP-07 (Intelligence), GAP-11 (Task Undo)  
**One-Apex integrity:** MAINTAINED

---

## GAP-06 — Knowledge API + Dashboard Surface

### Backend

File: `routes/knowledge.js`

Two read-only routes added after existing KGE routes:

**`GET /api/knowledge/items`**
- Auth: file-level `router.use(require('../lib/app-auth'))`
- Calls: `semanticMemory.search(q, opts)` — read-only
- Query params: `q`, `domain`, `category`, `status`, `limit` (max 100), `min_confidence`
- Adds per-item derived fields: `knowledge_state` (FULLY_KNOWN / PARTIALLY_KNOWN / CONFLICTING / UNKNOWN) and `confidence_tier` (VERY HIGH / HIGH / MEDIUM / LOW / UNCERTAIN / UNKNOWN)
- No fabrication: unavailable fields returned as null
- Error response includes `items: []` envelope

**`GET /api/knowledge/state`**
- Auth: inherited file-level middleware
- Calls: `kge.getGapStats()` — read-only
- Derives `classification`: BLOCKED (blocking > 0) → DEGRADED (open > 10) → PARTIAL (open > 3) → SUFFICIENT (open === 0)
- Returns: `{ ok, classification, stats, ts }`

### Frontend

File: `public/dashboard.html`

- `pages` array: `'knowledge'` added
- `pageMeta.knowledge`: `{ title:'Knowledge', sub:'Facts · Evidence · Gaps · Coverage' }`
- Nav button: `#nav-knowledge` with ◆ icon
- Mobile nav: KNOWLEDGE button
- `#page-knowledge` div: three ds-panels (Coverage State, Knowledge Items + search, Open Gaps)
- JS: `_knRenderItem()`, `_knLoadItems()`, `_knLoadState()`, `_knLoadGaps()`, `knowledgeSearch()`, `knowledgeRefresh()` (all `window`-exposed)
- PAGE SWITCH HOOK: `if (name === 'knowledge') { knowledgeRefresh(); }`

---

## GAP-07 — Intelligence API Surface

**Reclassification:** GAP-07 was documented as Class C (missing route file). `routes/intelligence.js` exists with 12 production routes. Gap was Class B (missing specific endpoints). Routes added to existing file — no new file created.

File: `routes/intelligence.js`

Three read-only routes added before `module.exports`:

**`GET /api/intelligence/briefing`**
- Auth: `requireAppAccess`
- Calls: `sie.generateExecutiveBriefing()` — preserves existing 6h cache (`sie:briefing:v1`)
- Returns: `{ ok, briefing }` with briefing fields: biggest_opportunity, biggest_threat, biggest_bottleneck, highest_leverage_action, strategic_focus_this_week, strategic_focus_this_month, generated_at, data_inputs
- Degraded response on error: `{ ok:false, briefing:null, degraded:true }`

**`GET /api/intelligence/opportunities`**
- Auth: `requireAppAccess`
- Does NOT call `opportunity-engine.detect()` (write-oriented — calls Claude API + persists)
- Queries `opportunities` table directly: `id, title, description, composite_score, status, evidence_refs, created_at`
- Query params: `status` (default: `'detected'`), `limit` (max 50)
- Returns: `{ ok, opportunities, count }`

**`GET /api/intelligence/health`**
- Auth: `requireAppAccess`
- Does NOT call `snapshot()` (writes to `civilization_health_snapshots`)
- Calls `getLatest()` first (reads latest snapshot row); falls back to `compute()` (read-only) if no snapshot
- Returns: `{ ok, source ('snapshot'|'computed'), score, classification, dimensions, alerts, snapshot_at }`

### Frontend

File: `public/dashboard.html`

- `pages` array: `'intelligence'` added
- `pageMeta.intelligence`: `{ title:'Intelligence', sub:'Briefing · Opportunities · Health' }`
- Nav button: `#nav-intelligence` with ◇ icon
- Mobile nav: INTEL button
- `#page-intelligence` div: three ds-panels (Strategic Briefing, Civilization Health, Detected Opportunities) + UX-12 boundary note
- JS: `_intLoadBriefing()`, `_intLoadHealth()`, `_intLoadOpportunities()`, `intelligenceRefresh()` (all `window`-exposed)
- PAGE SWITCH HOOK: `if (name === 'intelligence') { intelligenceRefresh(); }`

---

## GAP-11 — Task Undo Endpoint

File: `src/routes/tasks.js`

**`POST /api/tasks/undo`**
- Auth: `requireAppAccess`
- Operates on `agent_actions` table — NOT `apex_tasks`
- Body: `{ actionId? }` — optional
- If no `actionId`: queries last `agent_actions` row with `status='applied'`; returns `{ ok:false, blocked:true }` if none
- If `actionId` provided: verifies existence (404 if not found) and status (409 + blocked:true if not 'applied')
- On success: updates `agent_actions.status = 'undone'`
- Returns: `{ ok:true, actionId, status:'undone', message }`

---

## Side-Effect Verification

| Function | Write-oriented? | Used in GET route? | Resolution |
|---|---|---|---|
| `sie.generateExecutiveBriefing()` | No (6h cache, async fire-and-forget SIE log) | Yes | Safe |
| `opportunity-engine.detect()` | Yes (calls Claude + persists) | No | Direct table query used |
| `civilizationHealthEngine.snapshot()` | Yes (writes snapshot row) | No | `getLatest()` + `compute()` used |
| `civilizationHealthEngine.compute()` | No (pure calculation) | Yes (fallback) | Safe |
| `civilizationHealthEngine.getLatest()` | No (reads latest row) | Yes (primary) | Safe |
| `kge.getGapStats()` | No | Yes | Safe |
| `semanticMemory.search()` | No | Yes | Safe |

---

## Syntax Verification

```
node --check routes/knowledge.js     → OK
node --check routes/intelligence.js  → OK
node --check src/routes/tasks.js     → OK
```

---

## Test Results

`tests/rx-03-p1.test.js` — 51 assertions, 10 test groups — ALL PASS

- P3-01: knowledge_state derivation (7 fixtures)
- P3-02: confidence_tier derivation (11 tier boundaries)
- P3-03: coverage classification (8 fixtures)
- P3-04: task undo status guard (6 statuses)
- P3-05: opportunities read-only guard (detect() not called)
- P3-06: health read-only guard (snapshot() not called, getLatest + compute present)
- P3-07: undo route table + guard (agent_actions, not apex_tasks)
- P3-08: auth coverage (5 route checks)
- P3-09: knowledge/items response shape (5 field checks)
- P3-10: no duplicate route registrations (6 routes)

Regression: `tests/rx-02-p1.test.js` — ALL PASS  
Regression: `tests/knowledge-gap-engine.test.js` — 58 passed, 0 failed  
Regression: `tests/knowledge-final-certification.test.js` — 133 passed, 0 failed
