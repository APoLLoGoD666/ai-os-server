# 08 — Infrastructure Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/models/runtime/index.js, lib/health/monitor.js, lib/pg_database.js, lib/clients.js, lib/event-bus.js, render.yaml, server.js (startup), services/init.js

---

## models/runtime — The LLM Execution Layer

**File:** `lib/models/runtime/index.js`  
**Exports:** `{ execute, stream, voice }`

### Model Selection (execute)

**Selection hierarchy (in priority order):**

```
1. options.forceModel  → use exact model ID (selector.js internal use only)
2. options.domain === 'voice'  → gemini-2.5-flash
3. containment.getProviderOverride() === 'google'  → gemini-2.5-flash
4. options.tier present (new contract)  → TIER_ROUTING[tier]
5. options.client + options.model (legacy contract)  → caller-supplied model
```

### TIER_ROUTING Table (complete)

| Tier | Model |
|------|-------|
| `simple` | `claude-haiku-4-5-20251001` |
| `fast` | `claude-haiku-4-5-20251001` |
| `voice` | `claude-haiku-4-5-20251001` |
| `moderate` | `claude-sonnet-4-6` |
| `complex` | `claude-sonnet-4-6` |
| `balanced` | `claude-sonnet-4-6` |
| `critical` | `claude-opus-4-7` |
| `powerful` | `claude-opus-4-7` |
| *(unknown tier)* | `claude-sonnet-4-6` (falls back to moderate) |

### Circuit Breaker

Per-model circuit breaker (separate state per model ID):

```
Failure tracking:
  - Count consecutive non-429 errors
  - 429 rate-limit errors: DO NOT count toward breaker
  - Opens after 5 consecutive failures

Cooldown when open:
  delay = 60s × 2^(failures - 5)
  capped at: 15 minutes

Re-closes: after cooldown expires, next call is a probe
```

### Retry Policy

```
3 attempts max per execute() call

429 errors:
  attempt 1 → wait 15s
  attempt 2 → wait 30s
  attempt 3 → wait 45s
  → After 3 attempts: throw

Non-429 errors:
  → Immediately throw (no delay)
  → Record to circuit breaker

90s hard timeout per attempt (Promise.race with timeout rejection)
```

### Return Value Structure

```javascript
{
  requestId: uuid,
  result: <raw Anthropic SDK response>,  // unchanged for downstream compat
  meta: {
    caller, model, tier, provider, latency,
    inputTokens, outputTokens, costEstimate,
    success, traceId
  }
}
```

### Non-Blocking Side Effects (setImmediate after every successful execute())

```
1. bus.emit('CLAUDE_FIRST_TOKEN', ...)
2. output-capture.capture(modelResult, taskId, traceId)
3. feedback.process(modelResult, task, outcome)
4. governance.appendEvidenceBlock(...) → llm_invocations table
```

All 4 are fire-and-forget. Execution errors in these do not affect the returned result.

### stream() Behavior

Returns `{ requestId, stream: <SDK stream object>, meta }`.  
No retry on streaming — interruption handled by caller.

### voice() Behavior

**Observability shim only.** Emits telemetry but does NOT initiate any LLM or audio call. Actual voice execution is in `routes/gemini-live.js`.

---

## lib/health/monitor.js — In-Memory Health State

**File:** `lib/health/monitor.js`  
**Storage:** All in process memory — resets on restart

### State Structure

```javascript
_state = {
  providers: {
    anthropic: {
      status: 'healthy' | 'degraded' | 'unavailable',
      consecutiveFailures: number,
      totalCalls: number,
      totalFailures: number,
      lastSuccessAt: timestamp,
      lastFailureAt: timestamp,
      recentLatenciesMs: []  // rolling last 10
    },
    google: { same structure }
  },
  retrieval: {
    totalCalls, totalErrors, consecutiveErrors,
    recentLatenciesMs: [],  // rolling
    lastCallAt
  },
  reflexion: { totalWrites, failedWrites, lastFailureAt },
  policy: { fromDB, lastCallAt },
  certification: { lastResult, lastRunAt, lastFailures: [] },
  startedAt: timestamp
}
```

### Provider Status Transitions

```
Healthy → Degraded: consecutiveFailures >= 2
Degraded → Unavailable: consecutiveFailures >= 5
Any → Healthy: first success after failures (reset consecutiveFailures)
```

### `getHealthState()` — Overall Status Computation

```
'critical'  if BOTH anthropic AND google are 'unavailable'
'degraded'  if anthropic is 'unavailable' or 'degraded'
            OR retrieval.consecutiveErrors >= 3
            OR reflexion failure rate > 20% (with totalWrites > 5)
'healthy'   otherwise
```

### Thresholds

| Metric | Threshold |
|--------|-----------|
| Provider degraded | 2 consecutive failures |
| Provider unavailable | 5 consecutive failures |
| Provider high latency | 8000ms |
| Retrieval high latency | 3000ms |
| Retrieval degraded | 3 consecutive errors |
| Reflexion high failure rate | 20% |

### Who Updates the Monitor

| Function | Called from |
|----------|------------|
| `recordProviderCall(provider, success, latencyMs)` | models/runtime (lazy import) |
| `recordRetrievalCall(latencyMs, success)` | lib/memory/gateway.js |
| `recordReflexionWrite(success)` | lib/memory/reflexion-tracker.js |
| `recordPolicyRetrieval(fromDB)` | lib/cognitive/cognitivePolicy |
| `recordCertificationResult(pass, failures)` | scripts/certify.js |

---

## Supabase Client Topology

Five independent Supabase clients (confirmed from code):

| Client | File | Method | Reason |
|--------|------|--------|--------|
| Primary singleton | `lib/clients.js` | `getSupabaseClient()` | ~30 consumers |
| Governance | `lib/governance.js` | `createClient()` at module load | Independent connection lifecycle |
| Integrity crons | `lib/integrity-crons.js` | `createClient()` at module load | Independent connection lifecycle |
| Outbox relay | `lib/outbox-relay.js` | `createClient()` at module load | `_sb` singleton |
| Write-with-outbox | `lib/write-with-outbox.js` | `createClient()` at module load | **Dead code — no consumers** |
| Intelligence routes | `routes/intelligence.js` | `createClient()` at module load | `_sbClient` singleton |

Total: **up to 5 active Supabase HTTP connection pools** on the 220MB heap process simultaneously. `lib/write-with-outbox.js` connection is established at module load even though no code calls the exported function.

---

## lib/pg_database.js — Raw Postgres Pool

**Pool config:**
- `max: 10` connections
- SSL enforced (`ssl: { rejectUnauthorized: false }` or similar)
- Source: `DATABASE_URL` env var
- Slow query logging: queries > `SLOW_QUERY_MS` (env var, default UNKNOWN) → logged

**Used for:** pgvector queries, raw SQL operations, pg_helpers functions (30+)

---

## Render Infrastructure

### ai-os-server

```yaml
type: web
startCommand: node --max-old-space-size=220 server.js
healthCheckPath: /health
zeroDowntimeDeploys: false
```

**Memory budget:**
- V8 heap hard cap: 220MB
- Steady-state RSS: ~280MB (exceeds heap — RSS includes native heap, buffers, etc.)
- Startup peak: ~340MB (two sequential deploys would OOM if zero-downtime were enabled)
- `/health` warns at: heapMb > 150

**Zero-downtime disabled:** During deploy, old process stops BEFORE new process starts. Prevents simultaneous ~280MB + ~340MB = ~620MB OOM.

### apex-ai-sidecar (Python)

```yaml
type: web
startCommand: uvicorn sidecar.main:app --host 0.0.0.0 --port $PORT
```

Separate Render service. Only active if `RAG_SIDECAR_URL` env var set on ai-os-server. Status in production: UNKNOWN.

---

## Deferred Load Schedule (Memory Management)

All components delayed after server listen to reduce startup peak RSS:

| Delay | Component | Mechanism |
|-------|-----------|----------|
| 0ms (at listen) | services/init.js cascade | Direct call |
| 0ms (at listen) | civilization-runtime.js start | Direct call |
| 0ms (at listen) | cron-scheduler.start() | Direct call |
| +5 min | Mastra agents | setTimeout(300000) |
| +10 min | Ruflo daemon | child_process spawn via setTimeout(600000) |
| On demand | Domain lazy requires | `let _ref; function get() { _ref = _ref || require(...); }` |

---

## Ruflo Daemon

**Version:** v3.7.0-alpha.72  
**Port:** 3001 (MCP server — no conflict with server.js port 3000)  
**Start mechanism:** server.js spawns it as a child process 10 minutes after listen  
**Memory budget:** Not measured — could exceed remaining heap if large

**Key paths:**
```
.claude/          — 23 agent definitions, 10 command groups
.claude-flow/     — runtime config, sessions, logs, daemon state
.swarm/memory.db  — hybrid vector + SQLite memory store
.mcp.json         — 4 MCP servers (gitnexus, ruflo, ruv-swarm, flow-nexus)
```

**Restriction:** Ruflo swarm NOT auto-started on Render — trigger on demand only. MCP servers are for Claude Code CLI sessions only, NOT for server.js runtime use.

---

## GIT_SHA Tracking

```javascript
const GIT_SHA = process.env.GIT_SHA || execSync('git rev-parse --short HEAD').toString().trim()
```

Used in:
- `/health` response as `version`
- Telemetry factory as `gitSha`

If `git` is unavailable (Render deployment without git history), falls back to `process.env.GIT_SHA` which must be set by the build process.
