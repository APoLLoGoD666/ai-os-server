# Phase 5: Observability — Completion State v2

---

## Current Observability Stack

| Component | Implementation | Location | Status |
|---|---|---|---|
| Structured JSON logger | `lib/logger.js` | All services | Live |
| Request IDs on responses | `server.js` line 321 | HTTP layer | Live |
| Slow query logging | `pg_database.js` | Database layer | Live |
| Latency tracker | `lib/latency-tracker.js` | Voice session spans | Live |
| Sentry error tracking | DSN configured | Uncaught exceptions | Live |

---

## Phase 5 Additions

### Correlation IDs on Response Headers

`X-Request-Id` header is now set on all HTTP responses, using the same request ID generated at `server.js` line 321. This allows correlation between:
- Client-side errors (browser console, mobile logs)
- Server logs (structured JSON with `request_id` field)
- Sentry error reports (request ID attached to Sentry context)

Clients can log or display this header for support triage without any additional server changes.

### Subsystem Latency in /api/intelligence/performance

The `/api/intelligence/performance` endpoint (Phase 6) aggregates latency data from multiple subsystems. The self-check already measures and returns external service latency (Supabase 226ms, Notion 109ms, Slack 100ms). Phase 5 ensures these measurements feed into a unified performance view rather than only appearing in the self-check response.

---

## Gaps

| Gap | Description | Severity |
|---|---|---|
| No distributed tracing | No trace IDs propagated to Supabase, Notion, or Slack calls. Cannot reconstruct a full request span across services. | Medium |
| No error rate dashboard | Sentry captures errors but there is no in-product error rate endpoint or visualization. Error trends require Sentry UI. | Medium |
| Event bus has 0 recent events | `event_bus.recent_events: 0` in self-check. No code is currently emitting events to the bus. The bus is operational but unused. | High |
| No log aggregation | Structured JSON logs go to Render's log drain. No queryable log store (e.g. Logtail, Papertrail) is configured. | Medium |
| Latency tracker is voice-only | `lib/latency-tracker.js` tracks voice session spans (ack/meaningful/completion). HTTP API latency for non-voice routes is not tracked. | Low |

---

## Event Bus Gap — Detail

The self-check reports `recent_events: 0`. This means no subsystem is currently publishing events to the event bus. The bus has consumers (agent queue, etc.) but no producers. This is a significant observability and extensibility gap — the event-driven architecture is wired up but dormant. Emitting events for key actions (agent task created, agent task completed, self-check run, cron triggered) would enable real-time monitoring and future automation without code changes to consumers.

---

## Observability Maturity Score

| Dimension | Score | Notes |
|---|---|---|
| Error detection | 8/10 | Sentry live, structured logs |
| Latency visibility | 5/10 | Voice-only, no API-wide tracking |
| Correlation | 6/10 | Request IDs present, no distributed tracing |
| Event observability | 2/10 | Bus operational, zero events flowing |
| Log queryability | 3/10 | Logs exist, no queryable store |

Overall: functional for basic debugging, not yet production-grade for incident response.
