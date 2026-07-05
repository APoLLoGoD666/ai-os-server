# 07 — Runtime Certification

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Runtime Certification Scope

This document certifies the runtime properties:
- Initialization completeness
- Partial initialization behavior
- Execution after critical failures
- LLM circuit breaker
- Health reporting accuracy
- Cron reliability

---

## Initialization Certification

### Certification: Is initialization atomic?

**Verdict: NOT ENFORCED**

Evidence:
- `services/init.js`: "each initialization step is wrapped in individual try/catch. Any step failure is non-fatal"
- Steps 1–12 proceed regardless of prior step failures
- Guard: `_initialized` flag prevents double-init
- Server begins accepting HTTP connections (health check responds 200) before all initialization steps complete
- Deferred loads (+5min Mastra, +10min Ruflo) mean the system is partially initialized for 10 minutes after startup

**There is no barrier that prevents request handling during initialization.**

---

### Certification: Can subsystems partially initialize?

**Verdict: YES — confirmed**

Evidence:
1. `lib/goals/goal-graph._load()`: async fire-and-forget at module load. DB unavailable → empty in-memory Maps. Goal weights in attention engine = 0. No error surfaced to health check.

2. Mastra agents (+5min): `getMastraStatus()` in `/health` reports status. If Mastra fails, `/health` shows `mastra: false` but HTTP server continues normally.

3. Event bus handlers (Steps 8–9 of services/init.js): only wired if SLACK_BOT_TOKEN/NOTION_API_KEY present. Without these, AGENT_COMPLETED is emitted but not persisted to `apex_agent_runs` via the event path. System appears healthy but agent run history has gaps.

4. Constitution subsystem: `lib/constitution/watchdog.js` lazy loads 5 sub-modules. If any fail to load, watchdog has partial constitution.

---

### Certification: Does /health accurately reflect system state?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `/health` queries `civilization_health_snapshots` — but telemetry snapshot write is DISABLED (DATA-5 comment). Snapshot may be arbitrarily stale.
- `/health` includes `mastra: getMastraStatus()` — reflects Mastra state
- `/health` includes `heapMb` — accurate from `process.memoryUsage()`
- `/health` includes `sentry: !!process.env.SENTRY_DSN` — presence check only, NOT confirmation Sentry is initialized (UR08)
- `/health` does NOT report: goal-graph initialization state, event bus handler state, constitution module state, cron job health, number of active WebSocket connections (though global._apexWsCount exists)

**Health check coverage:** Partial. Several subsystem failures are invisible to `/health`.

---

## LLM Circuit Breaker Certification

**File:** `lib/models/runtime/index.js`

### Certification: Is the circuit breaker enforced?

**Verdict: ENFORCED**

Evidence:
- Per-model state tracked in Map keyed by model ID
- Opens after 5 consecutive non-429 errors
- Cooldown: `60s × 2^(failures - 5)`, capped at 15 minutes
- While open: execute() throws immediately (no API call)
- Half-open probe: first call after cooldown
- 429 errors: do NOT count toward breaker (correct — rate limit is not an execution failure)

**Coverage:** Circuit breaker is per-model. A failing Opus 4.7 does not protect Sonnet or Haiku calls.

### Certification: Is there a fallback when circuit breaker is open?

**Verdict: NOT ENFORCED**

Evidence:
- No confirmed fallback model selection when circuit breaker is open
- `containment.getProviderOverride() === 'google'` provides a cross-provider path to Gemini
- But `containment` implementation was not read — whether it activates on circuit breaker state is UNKNOWN
- If Opus 4.7 breaker opens: chat requests fail. No automatic downgrade to Sonnet.

---

## Agent Queue Runtime Certification

**File:** `lib/agent-queue.js`

### Certification: Is concurrency enforced?

**Verdict: ENFORCED**

Evidence:
- `MAX_CONCURRENCY = 3` enforced in `_drain()`: `while (_running < 3 && queue.length > 0)`
- `_running` counter is incremented at task start and decremented in `finally` — no task bypasses this
- `MAX_QUEUE_DEPTH = 50`: checked in `enqueue()` before push — excess tasks dropped (not queued)

**Drop behavior:** Tasks beyond 50 are logged as errors and dropped permanently — no persistence of dropped tasks.

### Certification: Is deduplication enforced?

**Verdict: ENFORCED**

Evidence:
- `enqueue(id, fn, meta)`: checks `_queue.find(t => t.id === id)` and `_runningIds.has(id)` before pushing
- Duplicate id in queue or running → silently ignored
- Dedup is by id only — different ids with same function are not deduplicated

---

## Cron System Certification

**File:** `lib/cron-scheduler.js`

### Certification: Are cron jobs reliably executed?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- Cron execution confirmed: `lib/cron-scheduler.start()` called in listen callback
- 5 jobs registered: wiki_consolidation, vault_health, daily_briefing, weekly_review, adaptation_refresh
- Execution log: `cron_run_log` Supabase table (confirmed from `/api/cron/history` endpoint)
- BUT: cron scheduler relies on the Node.js process staying alive — Render process restarts between scheduled times would cause missed cron runs
- No distributed lock or external cron service (like pg_cron) confirmed — single-process cron

**Missed runs:** If the process restarts between cron intervals, scheduled jobs may be missed. The scheduler does not catch up on missed runs (UNKNOWN — not confirmed from code).

---

## Memory Budget Certification

### Certification: Is the 220MB heap limit enforced?

**Verdict: ENFORCED (by OS/V8)**

Evidence:
- `node --max-old-space-size=220` in render.yaml startCommand
- V8 enforces this limit at the OS level — the process is killed by the OOM killer if exceeded
- zeroDowntimeDeploys: false prevents two instances (old + new) consuming 280MB + 340MB simultaneously

### Certification: Is memory usage monitored?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `/health`: `heapMb > 150` → `heapWarning: true` — warning threshold is reported
- Warning is informational only — no automatic action (no process restart, no traffic drain)
- `lib/health/monitor.js` does not track heap usage — only provider/retrieval/reflexion health

---

## Runtime Certification Summary

| Property | Verdict |
|----------|---------|
| Initialization is atomic | NOT ENFORCED |
| Partial initialization is visible to health checks | PARTIALLY ENFORCED |
| /health accurately reflects system state | PARTIALLY ENFORCED |
| Circuit breaker enforces LLM failure limits | ENFORCED |
| Fallback exists when circuit breaker opens | NOT ENFORCED |
| Agent concurrency limit is enforced | ENFORCED |
| Cron jobs never miss runs | NOT ENFORCED (single-process, no catchup) |
| 220MB heap limit is enforced | ENFORCED (OS/V8 level) |
| Execution continues after critical failures | YES — by design |
