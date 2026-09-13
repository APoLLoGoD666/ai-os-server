# API → INTERFACE DATA MAP

**Companion to:** POST-PHASE-H-API-INTERFACE-INTEGRATION-AUDIT.md  
**Date:** 2026-08-30  
**Purpose:** Quick-reference data lineage map for every interface-consumed API  

---

## Route Resolution Order

1. `routes/*.js` (auto-loaded alphabetically under `/api`) — WINS for any duplicate
2. `routes/tts-gemini.js` (explicit, under `/api`)
3. `src/routes/telemetry/index.js` (factory, at `/`) — some paths shadowed
4. `src/routes/*.js` (explicit, each defines own `/api/*` paths)

---

## Data Lineage: Critical Interface Values

```
UI: Agent runs table
  → fetchJson('/api/intelligence/agent-runs')
  → routes/intelligence.js GET /intelligence/agent-runs
  → sbAdmin.from('apex_agent_runs').select('task_id,objective,success,cost_usd,complexity,created_at')
  → Supabase: apex_agent_runs table
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Total AI cost display
  → fetchJson('/api/intelligence/cost-summary')
  → routes/intelligence.js GET /intelligence/cost-summary
  → sbAdmin.from('apex_agent_runs').select('success,cost_usd,complexity,created_at').limit(1000)
  → Computed: totalRuns, successRate, totalCostUsd, byComplexity
  → Supabase: apex_agent_runs (last 1000)
  LIVE: YES (capped) | REFRESH: Tab switch | CACHE: None

UI: Roadmap progress %
  → fetchJson('/api/master/metrics')
  → src/routes/master.js GET /api/master/metrics
  → parseRoadmap() → filesystem: roadmap.json
  → Computed: completed/total * 100
  LIVE: NO (filesystem) | REFRESH: Server restart | CACHE: File parse

UI: Timeline events list
  → fetchJson('/api/timeline')
  → src/routes/telemetry/index.js GET /api/timeline
  → sbAdmin.from('apex_timeline').select(...)
  → Supabase: apex_timeline table
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Notification badge
  → fetchJson('/api/notifications')
  → src/routes/notifications.js GET /api/notifications
  → sbAdmin.from('apex_notifications')...  ⚠️ MARKS ALL READ AS SIDE EFFECT
  LIVE: YES | SIDE EFFECT: Marks read | REFRESH: Tab switch

UI: Task list
  → fetchJson('/api/tasks')
  → src/routes/tasks.js GET /api/tasks
  → pgGetRecentAgentTasks()
  → Postgres: apex_tasks
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Finance summary (income/expense/net)
  → fetchJson('/api/finance/summary')
  → src/routes/finance.js GET /api/finance/summary
  → Supabase: personal finance transactions table
  LIVE: YES | REFRESH: Tab switch | CACHE: Possible 60s

UI: Business expenses
  → fetch('/api/finance/expenses')
  → routes/finance.js GET /finance/expenses (BUSINESS module)
  → Supabase: business expense table
  LIVE: YES | NOTE: Different service from /api/finance/summary

UI: Knowledge items
  → fetch('/api/knowledge/items')
  → routes/knowledge.js GET /knowledge/items
  → semanticMemory.search()
  → lib/memory/semantic-memory.js
  → Supabase: apex_memories (type=semantic)
  Fields: {fact, category, domain, confidence, source, status,
           validation_state, support_count, contradiction_count,
           knowledge_state (computed), confidence_tier (computed)}
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Knowledge state badge
  → fetch('/api/knowledge/state')
  → routes/knowledge.js GET /knowledge/state
  → kge.getGapStats()
  → Derived classification: SUFFICIENT | PARTIAL | DEGRADED | BLOCKED
  LIVE: YES | REFRESH: Tab switch

UI: System health indicator
  → fetch('/health')
  → src/routes/telemetry/index.js GET /health  (WINS over health.js)
  → Process memory + pg pool query + env checks
  → {status: 'ok'|'degraded'|'down', db, tts, ai, memory, mastra, ws}
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Self-check subsystem health
  → fetch('/api/intelligence/self-check')
  → routes/intelligence.js GET /intelligence/self-check  (WINS over telemetry)
  → Process RSS, Supabase probe, event bus, agent queue, Obsidian tunnel
  → {checks:{memory,supabase,event_bus,agent_queue,obsidian}, issues:[]}
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Memory health gauge
  → fetch('/api/memory/health')
  → routes/memory.js GET /memory/health
  → Memory subsystem health checks
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Recent memories
  → fetch('/api/memory/episodic/recent')
  → routes/memory.js GET /memory/episodic/recent
  → Supabase: apex_memories (type=episodic, recent)
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Intelligence briefing
  → fetch('/api/intelligence/briefing')
  → routes/intelligence.js GET /intelligence/briefing
  → Computed from agent runs, news, opportunities
  LIVE: YES | REFRESH: Tab switch | CACHE: None

UI: Agent status grid
  → fetchJson('/api/agents')
  → routes/agents.js GET /agents
  → Supabase: apex_agents table (slug, name, status, ...)
  LIVE: PARTIAL (sync-dependent) | REFRESH: Tab switch or manual sync

UI: Standing approvals
  → fetch('/api/tasks/standing-approvals')
  → src/routes/tasks.js GET /api/tasks/standing-approvals
  → Supabase: apex_notifications (standing approval type)
  LIVE: YES | REFRESH: Tab switch

UI: WebSocket event stream
  → new WebSocket('/ws/viz')
  → lib/ws-handler.js
  → Ring buffer 300 events from internal event bus
  LIVE: YES | EVENT-DRIVEN | No DB

UI: Civilisation status
  → fetch('/api/civilisation/status')
  → routes/civilization.js GET /civilisation/status (⚠️ NO AUTH)
  → Supabase: civilization tables
  LIVE: YES | AUTH: MISSING

UI: Governance dashboard
  → fetch('/api/governance/dashboard')
  → routes/governance.js GET /governance/dashboard
  → Supabase: governance tables
  LIVE: YES | AUTH: _auth | REFRESH: Tab switch
```

---

## Broken Integrations Quick Reference

| Frontend Call | Correct Path | Fix Type |
|--------------|-------------|----------|
| GET /api/tasks/approvals | GET /api/tasks/standing-approvals | Frontend path rename |
| POST /api/tasks/:id/approve | POST /api/tasks/approve (body:{taskId}) | Frontend call refactor |
| GET /api/university/flashcards | GET /api/life/university/flashcards | Frontend path rename |
| POST /api/university/sessions | POST /api/university/study-sessions | Frontend path rename |
| PATCH /api/crm/clients/:id | Remove or redirect to /api/operations/* | Remove dead call |
| POST /api/health/supplements/:id/toggle | Create route in routes/health.js | New backend route |

---

## Unauthenticated Routes (Security)

| Route Pattern | File | Fix |
|--------------|------|-----|
| GET /api/civilisation/* (15 routes) | routes/civilization.js:477+ | Add router.use(_auth) before line 477 |
| GET /api/context/queue | routes/context.js:16 | Add _auth middleware |
| DELETE /api/context/queue/:id | routes/context.js:20 | Add _auth middleware |
| POST /api/civilisation/consensus/propose | routes/civilization.js:577 | Covered by above fix |
| POST /api/civilisation/consensus/vote | routes/civilization.js:585 | Covered by above fix |

---

## Shadow/Dead Code Routes

| Active Route | Dead Route | Winner |
|-------------|-----------|--------|
| routes/intelligence.js /intelligence/agent-runs | telemetry/index.js /api/intelligence/agent-runs | intelligence.js |
| routes/intelligence.js /intelligence/cost-summary | telemetry/index.js /api/intelligence/cost-summary | intelligence.js |
| routes/intelligence.js /intelligence/lessons | telemetry/index.js /api/intelligence/lessons | intelligence.js |
| routes/intelligence.js /intelligence/self-check | telemetry/index.js /api/intelligence/self-check | intelligence.js |
| telemetry/index.js /health | src/routes/health.js /health | telemetry |
| telemetry/index.js /api/system/health/detailed | src/routes/health.js /api/system/health/detailed | telemetry |

---

## Response Field Map (Key Routes)

### /api/master/metrics
```
{
  ok: bool
  roadmap: {
    total: int       → roadmap.json total items
    completed: int   → roadmap.json completed items
    pending: int     → total - completed
    pct: int         → completion percentage (0-100)
  }
  tasks: int          → apex_tasks row count
  pipelineRuns: int   → apex_timeline row count (or agent run count)
  agentRuns: int      → apex_agent_runs sampled count (max 500)
  successRate: int    → % successful runs (nullable if no data)
  totalCostUsd: str   → formatted to 4 decimal places
  costByWorkstream: { [workstream]: str }  → cost per prefix category
}
```

### /api/intelligence/agent-runs
```
{
  ok: bool
  runs: [{
    task_id: str      → agent task identifier
    objective: str    → human-readable goal
    success: bool     → did run complete successfully
    cost_usd: float   → API cost for this run
    complexity: str   → 'simple'|'medium'|'complex'|null
    created_at: str   → ISO timestamp
  }]
}
```

### /api/intelligence/cost-summary
```
{
  ok: bool
  totalRuns: int
  successRate: int    → percentage (0-100)
  totalCostUsd: str   → 4 decimal places, last 1000 runs
  byComplexity: {
    [tier]: {
      runs: int
      succeeded: int
      successRate: int
      avgCostUsd: str
    }
  }
}
```

### /api/knowledge/items
```
{
  ok: bool
  count: int
  items: [{
    fact: str
    category: str
    domain: str
    confidence: float      → 0.0 to 1.0
    source: str
    status: str            → 'candidate'|'validated'|'deprecated'|'superseded'
    validation_state: str
    support_count: int
    contradiction_count: int
    created_at: str
    knowledge_state: str   → computed: 'FULLY_KNOWN'|'PARTIALLY_KNOWN'|'CONFLICTING'|'UNKNOWN'
    confidence_tier: str   → computed: 'VERY HIGH'|'HIGH'|'MEDIUM'|'LOW'|'UNCERTAIN'|'UNKNOWN'
  }]
}
```

### /api/intelligence/self-check
```
{
  ok: bool
  checks: {
    memory: { ok, rss_mb, rss_pct, heap_used_mb, container_mb, hint }
    supabase: { ok, latency_ms, error }
    event_bus: { ok, recent_events, last_event_age_s }
    agent_queue: { ok, queued, running, ... hint }
    obsidian: { ok, latency_ms } | { ok:false, error, hint }
  }
  issues: [str]        → list of non-ok check names
  latency_ms: int
  ts: str
}
```

### /health (telemetry/index.js)
```
{
  status: 'ok'|'degraded'|'down'
  version: str         → GIT_SHA
  uptime: float        → seconds
  timestamp: int       → epoch ms
  db: bool
  tts: bool
  ai: bool
  memory: { heapMb, rssMb, warning, heapLimit }
  mastra: {}           → Mastra status
  ws: int              → active WebSocket connections
  sentry: bool
  correlationIds: bool
  recentErrors: [str]  → last 3 errors
}
```

---

*Companion to POST-PHASE-H-API-INTERFACE-INTEGRATION-AUDIT.md*
