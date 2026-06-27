# OpenTelemetry — Decision Record

**Decision:** DEFERRED INDEFINITELY  
**First recorded:** Phase 28 audit  
**Reaffirmed:** 2026-06-06 (platform-hardening baseline)

---

## 1. Decision

OpenTelemetry is not implemented and will not be implemented while the platform remains a monolith with a single OTLP-capable backend requirement. No OTel imports exist in application code.

---

## 2. Current Observability Stack

| Layer | Implementation |
|---|---|
| Error tracking | Sentry v10 (^10.56.0) — Express handler + captureException in global error handlers |
| Trace propagation | X-Request-ID + X-Conversation-ID injected on every /api/ request (server.js:310-325) |
| Structured logging | lib/logger.js — JSON, LOG_LEVEL env var, module/message/meta/latency_ms fields |
| Slow query detection | pg_database.js — wraps pool.query, logs all queries exceeding SLOW_QUERY_MS (default 500ms) |
| Agent spans | apex_agent_runs table — cost_usd, token_usage, duration_ms, agent_summary, timestamps |
| Sync checkpoints | apex_sync_checkpoints table — per-sync run state and timing |
| Health probes | /health (basic) + /api/system/health/detailed (db latency, supabase, voice, agentQueue, obsidian) |

---

## 3. What OTel Would Add vs. Why It Doesn't Justify Cost

| OTel capability | Current equivalent | Gap worth the cost? |
|---|---|---|
| Distributed trace IDs across services | X-Request-ID propagated through single process | No — no separate services to correlate |
| Span hierarchy (parent/child) | Request → agent → DB flow visible via correlation ID + logs | No — all in-process, log correlation sufficient |
| OTLP export to Jaeger/Tempo/etc. | Sentry error+perf data | No — requires running a backend; adds infra cost |
| Auto-instrumentation (Express, pg, fetch) | Manual wrappers already in place for slow paths | No — marginal gain over existing slow-query logging |
| Metrics SDK (histograms, counters) | Sentry performance + DB latency fields in logger | No — not operating at a scale requiring custom metrics |

**Cost of adding OTel:** ~200 lines of instrumentation bootstrap, a running OTLP collector, and ongoing maintenance of SDK version compatibility. For a single-process Node monolith with no inter-service calls, this is unjustified overhead.

---

## 4. What IS Implemented Instead

- **Trace propagation:** X-Request-ID generated (uuid v4) at server.js:310, attached to `req`, echoed in `X-Request-ID` response header. X-Conversation-ID forwarded when present.
- **Request spans:** Every request logged at completion with `latency_ms`, status code, method, path, and correlation ID via lib/logger.js.
- **Agent spans:** `apex_agent_runs` rows written per agent invocation — captures `cost_usd`, `token_usage`, `duration_ms`, `agent_summary`, start/end timestamps.
- **Database spans:** Slow queries (>500ms) logged with query text and duration via pg_database.js wrapper. Threshold tunable via `SLOW_QUERY_MS`.
- **External API spans:** Notion client logs per-call latency. Correlation ID present in all outbound call log entries.
- **Sentry:** Captures all unhandled exceptions + Express middleware errors. DSN configured in instrument.js (hardcoded — flagged as G-1/G-2/G-3 in baseline).

---

## 5. Conditions for Revisiting

| Trigger | Why it changes the decision |
|---|---|
| Monolith splits into 2+ separately deployed services | Distributed tracing becomes necessary to correlate cross-service calls |
| A free/self-hosted OTLP backend is already running in the stack | Removes the infra cost objection |
| Sentry proves insufficient (blind spots in a specific subsystem) | Targeted OTel instrumentation for that subsystem only — not full SDK |
| Request volume exceeds ~1000 rpm sustained | Custom metrics/histograms may outperform log-based analysis at that scale |
