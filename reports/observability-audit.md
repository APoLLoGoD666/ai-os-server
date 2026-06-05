# Observability Audit — Phase 10
*Audited: 2026-06-05 | Source: lib/event-bus.js, lib/latency-tracker.js, server.js, services/slack/slack-system-health.js*

---

## Observable Systems

| System | Can detect failure? | Can diagnose? | Can recover? |
|---|---|---|---|
| Supabase DB | ✅ /health endpoint | ✅ error message returned | ⚠️ Manual restart |
| Anthropic API | ✅ circuit breaker | ✅ error buffer (last 3) | ✅ circuit breaker auto-recovery |
| Voice pipeline | ✅ latency tracker | ✅ p50/p95/p99 per span | ⚠️ Manual reconnect |
| Notion | ⚠️ errors logged to caller | ⚠️ console.error only | ⚠️ Manual |
| Slack | ⚠️ console.warn on failure | ⚠️ console.warn only | ⚠️ Manual |
| Cron jobs | ❌ no failure detection | ❌ only console.warn if job throws | ❌ No retry/recovery |
| Agent pipeline | ✅ cost cap + event bus | ✅ per-agent error context | ✅ 3 retries + Opus escalation |
| Memory | ✅ /health + 5-min log | ✅ heap/rss reported | ⚠️ Manual restart |
| Calendar sync | ⚠️ console.warn | ⚠️ console.warn only | ⚠️ Retries on next 30-min tick |
| RAG | ✅ /api/rag/health | ✅ | ✅ 30-min re-index |

---

## Health Endpoints

| Endpoint | Auth | What it checks | Response fields |
|---|---|---|---|
| GET /health | None (public) | DB, TTS, AI, memory, uptime | ok, db, tts, ai, memory{heapMb,rssMb,warning}, uptime, latency{p50/p95}, errors |
| GET /api/health | Unknown (needs verify) | Full system + latency + memory | Superset of /health |
| GET /api/latency-stats | requireAppAccess | p50/p95/p99 per class, abandonment, flow score, slowest 10 | Full latency object |
| GET /api/rag/health | Unknown | RAG sidecar availability | ok/error |
| GET /api/wiki/health | Unknown | Wiki vault availability | ok/error |
| GET /api/system/status | requireAppAccess | Integration token presence + live ping (?ping=true) | integrations, uptime, memory, ping{notion,slack,supabase} |

**Gap:** `/health` is public (no auth) — intentional for uptime monitoring tools (UptimeRobot). Acceptable.
**Gap:** Active WebSocket count is referenced in `slack-system-health.js` thresholds but not populated in `/health` response — always shows 0.

---

## Event Bus

**File:** `lib/event-bus.js`

```
Ring buffer: 200 events (in-memory, not persisted)
Dispatch: non-blocking via setImmediate()
Emit modes: async emit() / sync emitSync()
Query: recent(n), forSession(sessionId, n)
```

**13 defined event types:**
`VOICE_STARTED`, `AUDIO_RECEIVED`, `CLAUDE_STARTED`, `TOOL_DISPATCHED`, `TOOL_COMPLETED`,
`AGENT_COMPLETED`, `SESSION_COMPLETED`, `AGENT_STARTED`, `PIPELINE_STARTED`, `PIPELINE_COMPLETED`,
`PIPELINE_FAILED`, `AGENT_STEP_STARTED`, `AGENT_STEP_COMPLETED`

**Active listeners (wired in services/init.js):**
- `AGENT_STARTED` → `slack-agents.js notifyRunStart()`
- `AGENT_COMPLETED` → `slack-agents.js notifyRunComplete()` + `notion-sync.js logAgentRun()`

**Unlistened events:** VOICE_STARTED, AUDIO_RECEIVED, CLAUDE_STARTED, TOOL_DISPATCHED, TOOL_COMPLETED, SESSION_COMPLETED, PIPELINE_* — emitted but no consumer.

**Gap:** Events exist only in memory. After crash/restart the buffer is empty — no replay, no cross-session aggregation.

---

## Latency Tracker

**File:** `lib/latency-tracker.js`

```
Ring buffer: 500 sessions
Span types: 19 (audio_received → transcript → route → claude_start →
  claude_first_token → tool_dispatch/complete → tts_start/chunk →
  first_audio → user_interrupted → completed)
Clamp: [0, 3600000ms] — prevents DST/NTP outlier poisoning
```

**Reported metrics:**
- p50 / p95 / p99 by execution class (REFLEX / EXECUTIVE / BACKGROUND)
- Abandonment rate
- Conversation flow score = `1 - (interruptions + timeouts + restarts) / totalTurns`
- Slowest 10 sessions with full concurrent-metric snapshots
- Lifetime accumulators: `_totalTurns`, `_totalInterruptions`, `_totalTimeouts`, `_totalRestarts`

**Exposed at:** `GET /api/latency-stats` (auth required)

---

## Memory Monitoring

Three independent paths:

| Path | Frequency | Destination | Threshold |
|---|---|---|---|
| `console.log [HEALTH]` | Every 5 min | Render logs | None |
| `GET /health` | On-demand | HTTP response | >400MB heapMb = warning: true |
| `services/init.js runHealthCheck()` | Every 6 hours | Slack #apex-system-health | >400MB error, >460MB critical |

**Gap:** 5-min memory log goes to Render console only — not queryable after the fact. No persistent memory time-series.

---

## Cron Monitoring

**All 14 cron jobs:** fire-and-forget with `console.warn` on failure. No job-level success/failure tracking.

Gaps:
- No last-run timestamp recorded anywhere
- No consecutive failure counter
- No Slack alert when any cron fails (documented in `08 Operations/Cron-Registry.md` as a known gap)
- CRON-07 (Agent Schedule Fallback) runs every 5 min — no visibility into how many schedules it fires

**Recommendations:**
1. Add `apex_sync_checkpoints` write at start/end of each cron job
2. Add Slack alert after 3 consecutive failures for CRON-01 (Weekly Review) and CRON-02 (Daily Briefing)

---

## Error Tracking

**Sentry:** Installed (`@sentry/node` in package.json) but **DSN not set on Render** → Sentry is disabled. Errors fall back to:
- In-memory error buffer (last 3 errors, exposed via `/health`)
- `apex_notifications` table write via `_sinkError()`
- `console.error`

**Error buffer at `/health`:**
```json
"errors": ["last error message", ...]
```
3-item circular buffer — not sufficient for incident diagnosis.

---

## What Is Not Observable

| Gap | Severity | Impact |
|---|---|---|
| CPU usage | MEDIUM | Can't detect CPU saturation before OOM |
| Database query latency | MEDIUM | Can't diagnose slow Supabase queries |
| Cron job execution history | MEDIUM | Can't tell if cron ran, succeeded, or was skipped |
| Event bus persistence | LOW | No replay after restart |
| Per-route API latency | LOW | Only aggregate by execution class |
| WebSocket count (active) | LOW | Threshold defined but metric not populated |
| Gemini/Claude token consumption | LOW | Cost tracking in orchestrator but not in health endpoints |
| Disk usage | LOW | Git worktrees accumulate; no disk monitoring |

---

## Recommendations (ranked by value)

| Action | Effort | Value |
|---|---|---|
| Set Sentry DSN on Render | 5 min | External error tracking live immediately |
| Add cron start/end checkpoint writes | 2 hours | Cron execution visibility |
| Populate activeWebSockets in /health | 30 min | Health threshold actually works |
| Add CPU usage to 5-min health log | 15 min | Detect saturation before crash |
| Persist event bus AGENT_COMPLETED to Supabase | 2 hours | Cross-session agent observability |
