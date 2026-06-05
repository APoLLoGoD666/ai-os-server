# Phase 10 Autonomy Evolution
**APEX AI OS v6 — Session: 2026-06-05**
**Score Impact: +0.5 Reliability, +0.5 Automation**

---

## Executive Summary

This session delivered two major autonomy improvements: a comprehensive self-diagnostics endpoint (`GET /api/intelligence/self-check`) and a Mastra OOM guard that prevents the server from crashing under memory pressure. Together these move APEX from reactive failure handling (crash, check logs) to proactive health monitoring (detect before impact). The remaining gap is automated recovery — detection exists, repair flows do not.

---

## 1. Self-Diagnostics — `GET /api/intelligence/self-check`

### What Was Implemented

A new route in `routes/intelligence.js` that runs synchronous health checks across all critical subsystems:

| Subsystem | Check Method | Pass Criteria |
|---|---|---|
| Memory (heap) | `process.memoryUsage()` | heapUsed / heapTotal < 85% |
| Supabase | `SELECT 1` probe query | Query returns within 3s |
| Event bus | `bus.listenerCount('*')` + `bus.recent().length` | > 0 listeners, recent array accessible |
| Agent queue | `queue.size()` | < 50 (not full) |
| Obsidian | HTTP GET to vault bridge | 200 response within 2s |
| Postgres (pg) | `pg.query('SELECT 1')` | Query returns within 3s |

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2026-06-05T14:23:01.000Z",
  "checks": {
    "memory": { "status": "ok", "heapPercent": 42 },
    "supabase": { "status": "ok", "latencyMs": 87 },
    "eventBus": { "status": "ok", "listeners": 11, "recentEvents": 47 },
    "agentQueue": { "status": "ok", "queueSize": 2, "capacity": 50 },
    "obsidian": { "status": "ok", "latencyMs": 31 },
    "postgres": { "status": "ok", "latencyMs": 12 }
  },
  "score": 6,
  "maxScore": 6
}
```

When any check fails, `"status"` becomes `"degraded"` and the failing subsystem returns `{ "status": "fail", "error": "..." }`.

### Integration Points

- Can be polled by external monitoring (UptimeRobot, etc.) — returns HTTP 200 on healthy, 503 on degraded
- Dashboard can surface this as a health indicator
- Future: auto-trigger repair flows on repeated failures

---

## 2. Mastra OOM Guard — Implemented in `server.js`

### Problem

Mastra (the workflow orchestration layer) was loading unconditionally at server startup. Under memory pressure (common after long agent pipeline runs), loading Mastra triggered Node.js OOM crashes approximately 5 minutes into heavy workloads.

### Solution

A named function `_loadMastra()` with a heap guard:

```javascript
async function _loadMastra() {
  const { heapUsed, heapTotal } = process.memoryUsage();
  const heapPercent = heapUsed / heapTotal;

  if (heapPercent > 0.75) {
    logger.warn(`[Mastra] Heap at ${Math.round(heapPercent * 100)}% — deferring load for 10 minutes`);
    setTimeout(_loadMastra, 10 * 60 * 1000).unref();
    return;
  }

  // Proceed with Mastra initialization
  await initializeMastra();
}
```

Key properties:
- Named function (not arrow) — enables self-reference for recursive retry
- `.unref()` on setTimeout — retry timer does not prevent process exit
- 10-minute retry interval — gives pipeline runs time to complete and GC to reclaim memory
- Heap threshold: 75% (conservative enough to leave margin for Mastra's own heap allocation)

### Effect

| Scenario | Before | After |
|---|---|---|
| Server start under normal load | Mastra loads immediately | Unchanged |
| Server start under memory pressure | OOM crash at ~5min mark | Deferred, retried in 10min |
| Long pipeline run completes | Memory spike → potential OOM | Mastra deferred until after spike |

---

## 3. Self-Healing Potential — Current Coverage

### What Already Exists

| Component | Self-Healing Capability |
|---|---|
| Notion client | Circuit breaker — trips after 5 consecutive failures, 60s recovery window |
| Slack client | Exponential backoff (4 retries, 1s/2s/4s/8s) — handles transient failures |
| Mastra | OOM guard with auto-retry (new this session) |
| Memory summary cache | In-flight guard prevents duplicate Haiku calls (new this session) |
| Cron jobs | `node-cron` restarts on uncaught exception within cron scope |

### What Is Missing

| Gap | Impact | Effort to Fix |
|---|---|---|
| Automated recovery actions | Detection without repair — human must intervene when self-check fails | High |
| Supabase reconnect on connection drop | Supabase SDK handles pooling but no explicit reconnect logic | Medium |
| Agent queue drain on restart | In-memory queue is lost on restart — in-flight tasks are abandoned | High |
| Obsidian bridge restart on timeout | 5s timeout returns error but bridge is not restarted | Low |

---

## 4. Technical Debt Discovery — Automated Report Refresh

`reports/technical-debt-prioritization.md` is currently refreshed manually. This creates a gap between actual system state and documented debt.

### Recommendation

Add a weekly cron job to server.js:

```javascript
cron.schedule('0 9 * * 1', async () => {
  // Monday 9am: regenerate technical debt report
  const debt = await analyzeDebt(); // reads apex_agent_runs failure patterns
  await writeVaultFile('System/Reports/technical-debt.md', debt);
  logger.info('[Cron] Technical debt report refreshed');
});
```

This leverages existing cron infrastructure and the REFLECTOR agent's analysis capability. No new dependencies required.

---

## 5. Roadmap: Detection → Recovery

The current state is **Detection Level 2** (proactive monitoring but manual recovery). The path to full autonomy:

| Level | Description | Current Status |
|---|---|---|
| 1 | Reactive — crashes are noticed when users report them | Superseded |
| 2 | Proactive detection — self-check + OOM guard | **Current** |
| 3 | Automated recovery — restart subsystems, drain queues on detection | Not implemented |
| 4 | Predictive — trend analysis to prevent failures before they occur | Future |

Level 3 requires implementing repair flows: when self-check detects Supabase failure > 3 times in 5 minutes, automatically attempt reconnect; when agent queue is full, emit alert to Slack; when heap > 90%, force GC and pause new agent spawns.

---

## 6. Score Impact

| Dimension | Before | After | Delta |
|---|---|---|---|
| Reliability | OOM possible, no self-check | OOM guarded, self-check live | +0.5 |
| Automation | Manual recovery only | Detection automated, recovery manual | +0.5 |
| Self-healing coverage | Circuit breakers only | + OOM guard + memory cache guard | +0.3 (absorbed into reliability) |

**Net score contribution: +0.5 Reliability, +0.5 Automation**

---

## 7. Next Steps

| Priority | Action | Effort |
|---|---|---|
| HIGH | Implement Supabase automatic reconnect on connection drop | 2 hours |
| HIGH | Add agent queue persistence (Redis or Supabase) for crash recovery | 4 hours |
| MEDIUM | Automate technical-debt-prioritization.md refresh via weekly cron | 1 hour |
| MEDIUM | Add Slack alert when self-check returns degraded status | 2 hours |
| LOW | Level 4 predictive monitoring via trend analysis of self-check history | Future sprint |
