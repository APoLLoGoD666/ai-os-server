# Platform Hardening — Audit Baseline

**Branch:** feature/platform-hardening  
**Date:** 2026-06-06  
**Scope:** server.js, instrument.js, pg_database.js, lib/logger.js, routes/health.js, telemetry infrastructure

---

## Component Status Table

| Component | Status | Gap | Severity |
|---|---|---|---|
| **Sentry v10** (instrument.js) | Wired — Express handler + captureException in global handlers | DSN hardcoded; `sendDefaultPii: true`; no `tracesSampleRate`; no `environment` field | Medium |
| **Correlation IDs** (server.js:310-325) | Implemented — X-Request-ID injected + echoed in response header | None | — |
| **Structured logging** (lib/logger.js) | Implemented — JSON, LOG_LEVEL env var, module/message/meta fields | pg_database.js still uses console.error/warn (not routed through logger) | Low |
| **Slow query logging** (pg_database.js) | Implemented — wraps pool.query, logs queries >500ms | Threshold configurable via SLOW_QUERY_MS but default not documented | Low |
| **Health /health** | Basic — status, version, uptime, db, tts, ai, memory, mastra, recentErrors | Missing: ws count, sentry status, correlationIds flag | Low |
| **Health /api/system/health/detailed** | Comprehensive — db latency, supabase, voice, agentQueue, obsidian, latency stats | None | — |
| **CSP** | unsafe-inline + unsafe-eval in scriptSrc | No scriptSrcAttr directive | Low (accepted — single-user) |
| **Retention: apex_notifications** | 7-day TTL enforced | None | — |
| **Retention: apex_agent_runs** | 90-day TTL enforced | None | — |
| **Retention: agent_tasks** | 90-day TTL (done/cancelled) enforced | None | — |
| **Retention: email_queue** | No retention policy | Rows accumulate indefinitely — no purge job | Medium |
| **RLS: documents + memory tables** | RLS absent | Low risk — service_role bypasses RLS in practice | Low (accepted) |
| **OpenTelemetry** | Not implemented | Not justified for monolith — Sentry v10 sufficient (see opentelemetry.md) | — |
| **Circuit breaker: Anthropic** | Full CB implemented | None | — |
| **Circuit breaker: Notion** | Full CB implemented | None | — |
| **Circuit breaker: Slack/Gmail/GitHub/others** | No CB — accepted FRAGILE | Mitigations documented; no CB planned | Low (accepted) |
| **Timeout: Anthropic** | SDK-managed | None | — |
| **Timeout: Notion** | 30s explicit | None | — |
| **Timeout: Slack** | 10s explicit | None | — |
| **Timeout: Obsidian** | 5s AbortController | None | — |
| **Timeout: Calendar API** | 15s Promise.race | None | — |
| **Timeout: GitHub/OpenRouter/ElevenLabs** | No explicit timeout | Accepted — no change planned | Low (accepted) |

---

## Gap Summary (Action Required)

| # | Gap | Severity | Owner |
|---|---|---|---|
| G-1 | Sentry DSN hardcoded in instrument.js | Medium | instrument.js |
| G-2 | `sendDefaultPii: true` — PII in Sentry payloads | Medium | instrument.js |
| G-3 | No `tracesSampleRate` or `environment` field in Sentry init | Medium | instrument.js |
| G-4 | email_queue: no retention/purge policy | Medium | DB migration |
| G-5 | pg_database.js uses console.error/warn instead of lib/logger.js | Low | pg_database.js |
| G-6 | /health missing ws count, sentry status, correlationIds flag | Low | routes/health.js |
| G-7 | CSP missing scriptSrcAttr directive | Low (accepted) | server.js |

---

## Scores (entering this session)

| Dimension | Score |
|---|---|
| Reliability | 8.5 / 10 |
| Security | 8.8 / 10 |
| Observability | 8.2 / 10 |
