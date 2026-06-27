# Phase 1 — Audit Chain Trace

**Date:** 2026-06-06  
**Defect:** `apex_agent_stages` table missing from Supabase schema

---

## Writers

### `agent-system/orchestrator.js:814`
```js
_sb.from('apex_agent_stages').insert(stageRows).then(({ error: se }) => {
    if (se) console.warn('[Audit] stage log non-fatal:', se.message);
}).catch(() => {});
```
- Called from `_auditLog()` at end of every `runAgentTeam()` execution
- Fire-and-forget (non-blocking, non-fatal)
- Inserts one row per agent stage per run
- Row schema derived from `agentLogs.map()` (lines 799–812):

| Column | Type | Source |
|--------|------|--------|
| `task_id` | TEXT NOT NULL | `taskId` arg |
| `stage` | TEXT NOT NULL | `l.role` (ARCHITECT/DEVELOPER/…) |
| `success` | BOOLEAN | role-specific evaluation |
| `error` | TEXT | `l.result.error` (capped 500 chars) |
| `duration_ms` | INTEGER | `l.duration` |
| `attempt` | INTEGER DEFAULT 1 | hardcoded `1` (retry counter reserved) |
| `created_at` | TIMESTAMPTZ | `new Date().toISOString()` |

---

## Readers

### `agent-system/agent-reputation.js:30`
```js
const { data, error } = await _sb
    .from('apex_agent_stages')
    .select('stage, success, duration_ms, attempt, error')
    .order('created_at', { ascending: false })
    .limit(300);
```
- Called by `_loadStageStats()` with 5-min cache TTL
- Computes: `successRate`, `failureRate`, `retryRate`, `avgLatencyMs`, `p95LatencyMs`, `medianMs` per stage
- Exported as: `getStageReputation()`, `getWeakestStage()`, `shouldPreEscalate()`, `getStageScores()`, `getFailurePatterns()`

### Downstream callers of `agent-reputation.js`:

| Caller | File | Purpose |
|--------|------|---------|
| `getFailurePatterns()` | `adaptation-engine.js:102` | Drives split_large_tasks adaptation |
| `getStageReputation('DEVELOPER')` | `adaptation-engine.js:121` | Drives model escalation adaptation |
| `shouldPreEscalate('DEVELOPER')` | `adaptation-engine.js:123` | Caps DEVELOPER pre-escalation |
| `getStageReputation('ARCHITECT')` | `adaptation-engine.js:137` | Drives ARCHITECT escalation |
| `getStageScores()` | `adaptation-engine.js:151` | Score-based model tier selection |
| `getStageReputation(stage)` | `adaptation-engine.js:154` | Per-stage confidence |
| `getStageReputation('DEVELOPER')` | `dynamic-agent-selector.js:118` | Real-time tier selection |
| `shouldPreEscalate('DEVELOPER')` | `dynamic-agent-selector.js:120` | Pre-escalation gate |
| `invalidateCache()` | `orchestrator.js:1112` | Post-run cache refresh |

---

## Failure Handling

**Writer:** Non-fatal. `console.warn('[Audit] stage log non-fatal: ...')`, pipeline continues.  
**Reader:** Non-fatal. `catch (e)` returns `{}` (empty stats). All callers handle empty stats gracefully — `shouldPreEscalate()` returns `false` when `total < minSamples`.

---

## Migration State

- `apex_agent_runs`: Created in `supabase-setup.js:198` — **EXISTS in Supabase** ✓
- `apex_agent_stages`: **NOT in `supabase-setup.js`** — **MISSING from Supabase** ✗
- No SQL migration files (`supabase-task-tables.sql`, `supabase-rls.sql`, `supabase-indexes.sql`) reference `apex_agent_stages`

---

## Operational Purpose

`apex_agent_stages` is the per-stage telemetry backbone of the adaptation system. Without it:
- Adaptation engine runs with zero stage data → all adaptations stay at minimum confidence
- Dynamic agent selector cannot pre-escalate DEVELOPER even with a 90% failure rate
- `getWeakestStage()` always returns `null`
- No latency p95 tracking per stage

**Conclusion: This table is a required production artifact. It was written into the codebase but never added to the migration scripts.**
