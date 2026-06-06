# Agent Reputation System Report
**Date:** 2026-06-06  
**Branch:** feature/agent-evolution  
**File:** `agent-system/agent-reputation.js`

---

## Problem

No mechanism existed to score agent performance over time. The `apex_agent_stages` table was being written by `_auditLog()` on every run but was never read. There was no way to identify the pipeline's weakest stage, compare failure rates across stages, or use historical performance to inform routing decisions.

## Root Cause

`_auditLog()` was write-only by design (simple audit log). The reputation question — "has this stage historically struggled, and should we compensate?" — was never asked. Success/failure were visible in Supabase but not aggregated, not cached, and not fed back into orchestration.

## Fix

Created `agent-system/agent-reputation.js`:

### Data Source
Reads `apex_agent_stages` (existing table, no schema change needed):
- `stage`, `success`, `duration_ms`, `attempt`, `error` columns
- Last 300 records per query
- 5-minute in-memory cache (TTL) to avoid hammering Supabase

### Computed Metrics Per Stage
- `successRate` — successes / total (3 decimal places)
- `failureRate` — failures / total
- `retryRate` — attempts > 1 / total
- `avgLatencyMs` — mean of duration_ms
- `p95LatencyMs` — 95th percentile latency
- `medianMs` — median latency
- `recentErrors` — last 5 error messages (for pattern detection)

### Stage Scoring (0–10)
```
score = successRate × 10
      - 0.5 if avgLatencyMs > 60s
      - 0.5 if avgLatencyMs > 120s
```

### Domain Agent Tracking
In-process circular buffer (max 500 entries). No extra DB schema.
- `recordDomainAgentRun(agentId, success, durationMs)` — called from domain agent invocations
- `getDomainAgentStats(agentId)` — success rate + avg latency per domain agent

### Key Functions

| Function | Purpose |
|----------|---------|
| `getStageReputation(stage)` | Single-stage stats |
| `getAllStageStats()` | All stages at once |
| `getWeakestStage()` | Stage with highest failure rate (min 5 samples) |
| `shouldPreEscalate(stage, threshold, minSamples)` | Routing decision helper |
| `getStageScores()` | 0–10 score per stage |
| `getFailurePatterns()` | Stages with >20% failure (ordered worst-first) |
| `getPerformanceSummary()` | Pipeline + domain combined view |
| `invalidateCache()` | Force reload after new pipeline run |

### Pre-escalation Integration
`shouldPreEscalate('DEVELOPER', 0.6, 15)` returns `true` when:
- At least 15 stage samples exist for DEVELOPER
- Failure rate exceeds 60%

In this case, orchestrator.js pre-assigns DEVELOPER to SONNET instead of HAIKU, skipping the first retry escalation entirely.

## Verification

```
node --check agent-system/agent-reputation.js  → OK
```

Integration with orchestrator.js verified syntactically.  
Pre-escalation guard requires minSamples=15 so new deployments aren't affected before baseline data exists.

## Risk

Medium. The pre-escalation path changes model selection. Guarded by:
1. `minSamples=15` — no effect until enough data
2. `threshold=0.6` — conservative threshold (>60% failure before escalating)
3. Wrapped in try/catch — any error falls back to existing static routing

## Rollback

Remove `const _reputation = require('./agent-reputation');` from orchestrator.js and the pre-escalation block and `invalidateCache()` call. Delete `agent-system/agent-reputation.js`.
