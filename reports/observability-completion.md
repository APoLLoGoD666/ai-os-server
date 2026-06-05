# Observability State — Phase 21 (Updated)
*Initial: Phase 18 | Updated: Phase 21/23 | 2026-06-05*

Previous version covered: cron history (4 jobs), WS count, CPU telemetry.
This version adds: 4 more crons instrumented, pipeline hooks wired.

---

## Metrics Inventory

### Cron Execution History

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| Last run timestamp | ✅ | ✅ apex_sync_checkpoints | ✅ SQL | ❌ |
| Last run status (ok/error) | ✅ | ✅ | ✅ | ❌ |
| Last run duration_ms | ✅ | ✅ | ✅ | ❌ |
| Last run error message | ✅ | ✅ | ✅ | ❌ |
| Consecutive failure count | ❌ | ❌ | ❌ | ❌ |

**Crons instrumented (8 of 8 meaningful):**
```
wiki_consolidation, daily_briefing, weekly_review, news_ingest  (Phase 18)
vault_health, calendar_sync, schedule_fallback, reflection_check (Phase 23)
```

**Query:**
```sql
SELECT key, value::json, updated_at FROM apex_sync_checkpoints
WHERE key LIKE 'cron:%' ORDER BY updated_at DESC;
```

---

### WebSocket Telemetry

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| Active WS count | ✅ `global._apexWsCount` | ❌ point-in-time | ⚠️ /health only | ✅ via health check thresholds |
| WS session lifecycle | ✅ `_wsSessions` Map | ❌ | ❌ | ❌ |
| WS error events | ✅ console.error | ❌ | ❌ | ❌ |

**Evidence:** `server.js` — `Object.defineProperty(global, '_apexWsCount', { get: () => _wsSessions.size })`. Live count exposed via `global._apexWsCount || 0` in `services/init.js`.

---

### CPU Telemetry

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| CPU user time (cumulative ms) | ✅ `process.cpuUsage()` | ❌ Render logs only | ❌ | ❌ |
| CPU sys time (cumulative ms) | ✅ `process.cpuUsage()` | ❌ Render logs only | ❌ | ❌ |

**Evidence:** `server.js` — `const cpu = process.cpuUsage()` in 5-min health log interval.
**Note:** `process.cpuUsage()` returns cumulative values since process start — useful for spotting runaway processes, not for instantaneous CPU%.

---

### Memory Telemetry

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| Heap used (MB) | ✅ | ❌ Render logs + /health | ⚠️ /health only | ✅ `>400MB heapMb = warning: true` |
| RSS (MB) | ✅ | ❌ | ⚠️ /health only | ✅ `>400MB error`, `>460MB critical` via Slack |
| Memory warning flag | ✅ /health | ❌ | ✅ | ✅ |

**Evidence:** `server.js` /health route + `services/slack/slack-system-health.js` thresholds.

---

### Agent Execution Telemetry

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| Pipeline start | ✅ console.log + **Slack** (Phase 23) | ✅ apex_agent_runs | ✅ | ✅ Slack #apex-agents |
| Pipeline complete | ✅ console.log + **Slack** (Phase 23) | ✅ apex_agent_runs | ✅ | ✅ Slack #apex-agents |
| Pipeline failed | ✅ console.log + **Slack** (Phase 23) | ✅ apex_agent_runs | ✅ | ✅ Slack #apex-agents + #apex-alerts |
| Per-step duration | ✅ console.log | ❌ | ❌ | ❌ |
| Cost per run | ✅ console.log | ✅ apex_agent_runs.cost_usd | ✅ | ❌ |
| Token breakdown | ✅ console.log | ✅ apex_agent_runs.agent_summary | ✅ | ❌ |
| Model used | ✅ console.log | ✅ apex_agent_runs | ✅ | ❌ |
| Circuit breaker state | ✅ console.warn | ❌ | ❌ | ❌ |

---

### Queue Telemetry

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| Notion queue depth | ❌ | ❌ | ❌ | ❌ |
| Notion queue wait time | ❌ | ❌ | ❌ | ❌ |
| Agent task queue depth | ✅ apex_tasks status | ✅ | ✅ | ❌ |

---

### Database Telemetry

| Metric | Collected? | Persisted? | Queryable? | Alertable? |
|---|---|---|---|---|
| DB connectivity | ✅ /health check | ❌ | ✅ /health | ✅ via /health failure |
| DB latency | ✅ `/api/system/status?ping=true` | ❌ | ✅ on-demand | ❌ |
| Query duration | ❌ | ❌ | ❌ | ❌ |
| Connection pool size | ✅ pgPool config | ❌ | ❌ | ❌ |

---

### External API Telemetry

| Integration | Latency | Error Count | Circuit Breaker State | Alertable? |
|---|---|---|---|---|
| Anthropic | ✅ per-agent duration in logs | ❌ not aggregated | ✅ console.warn | ❌ |
| Notion | ❌ | ❌ | ✅ console.warn | ❌ |
| Slack | ✅ retry logs | ❌ | N/A | ❌ |
| Supabase | ✅ /health latency | ❌ | N/A | ❌ |
| Gemini | ✅ latency-tracker (voice) | ❌ | N/A | ❌ |
| Others | ❌ | ❌ | N/A | ❌ |

---

## Observability State After Phase 23

| System | Detectable? | Diagnosable? | Recoverable? |
|---|---|---|---|
| Supabase DB | ✅ /health | ✅ error message | ⚠️ Manual restart |
| Anthropic API | ✅ circuit breaker | ✅ error buffer | ✅ Auto-recovery |
| Voice pipeline | ✅ latency tracker | ✅ p50/p95/p99 | ⚠️ Manual reconnect |
| Notion | ✅ circuit breaker logs | ✅ `[notion] circuit` logs | ✅ Auto-recovery after 60s |
| Slack | ✅ retry warns | ✅ `[slack]` logs | ✅ 4 retries |
| Cron jobs (8 key) | ✅ apex_sync_checkpoints | ✅ status + error + duration | ⚠️ Next tick auto-retries |
| Agent pipeline | ✅ apex_agent_runs + **Slack** | ✅ full cost/token/error detail | ✅ 3 retries + Opus escalation |
| Memory | ✅ /health + 5-min log | ✅ heap/rss | ⚠️ Manual restart |
| CPU | ✅ 5-min log | ✅ user/sys ms cumulative | ⚠️ Manual restart |
| WebSocket count | ✅ health check thresholds | ✅ ws=N in health log | N/A |

---

## Remaining Observability Gaps (Accepted)

| Gap | Severity | Decision |
|---|---|---|
| DB query latency (slow queries) | MEDIUM | ACCEPTED — Supabase free tier; SDK handles reconnects |
| Notion queue depth / wait time | LOW | ACCEPTED — MAX_CONCURRENT=3 is visible implicitly |
| Event bus persistence (replay) | LOW | DEFERRED — 200-event buffer sufficient for single-user |
| Sentry DSN not set | MEDIUM | DEFERRED — apex_notifications table covers 99% of cases |
| Circuit breaker states not in /health | LOW | DEFERRED — console logs sufficient |
| Per-step agent latency not persisted | LOW | ACCEPTED — console.log is enough for diagnosis |
| Disk usage monitoring | LOW | ACCEPTED — worktree cleanup runs on startup |
| Consecutive cron failure alerting | LOW | ACCEPTED — checkpoint visibility sufficient |
