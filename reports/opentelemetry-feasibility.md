# APEX AI OS — OpenTelemetry Feasibility Audit

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 6

---

## Verdict: NOT JUSTIFIED

OpenTelemetry instrumentation is deferred indefinitely. The cost/benefit ratio does not justify implementation for a monolithic architecture with existing Sentry coverage.

---

## Current State

`@opentelemetry` packages are present in `node_modules` but only as transitive dependencies via `claude-flow`. No APEX source file imports or initializes any OTel SDK. There are no active spans, tracers, or metric exporters in the codebase.

Confirmed via source inspection: zero direct `@opentelemetry` imports in `server.js`, `agent-system/`, or `routes/`.

---

## What Sentry v10 Already Provides

| Capability | Sentry v10 Coverage |
|-----------|---------------------|
| Unhandled exception capture | `Sentry.init()` global handler |
| Unhandled promise rejection capture | Automatic via Node.js integration |
| Express error handler | `setupExpressErrorHandler(app)` — all 5xx errors captured |
| Performance monitoring | Transaction tracing via `tracesSampleRate` |
| Breadcrumbs | Automatic HTTP request breadcrumbs |
| User context | Manual `Sentry.setUser()` calls |
| Release tracking | `release` field in `Sentry.init()` config |
| Source maps | Supported via Sentry CLI |

For a monolithic Node.js/Express application, this is comprehensive coverage.

---

## What OpenTelemetry Would Add

| OTel Capability | Value for APEX |
|----------------|---------------|
| Distributed tracing spans | No value — APEX is a single process; no inter-service calls to trace |
| Latency histograms per route | Marginal — Sentry transaction tracing already shows this |
| Dependency graph visualization | Not applicable — no microservice mesh |
| Custom metrics (counters, gauges) | Useful, but achievable via Supabase tables + cron logs already in place |
| OTLP export to Grafana/Jaeger | Requires additional infrastructure (Grafana Cloud or self-hosted) — adds ops cost |

---

## Implementation Cost

| Cost Factor | Detail |
|-------------|--------|
| Engineering time | ~8 hours (package setup, SDK init, auto-instrumentation, Sentry bridge config) |
| Package weight | `@opentelemetry/node` + `@opentelemetry/auto-instrumentations-node` = ~2.1MB + ~8MB transitive additions |
| Middleware risk | OTel auto-instrumentation patches `http`, `express`, `pg` modules at startup; load-order conflicts with Sentry's Express handler are possible |
| Ongoing ops | Requires exporter endpoint (e.g. Grafana Cloud); adds monthly cost or self-hosted infra |
| Debugging surface | Two observability systems (Sentry + OTel) create confusion over which to check first |

---

## Risk Assessment

**Risk: Sentry + OTel conflict.** Both Sentry v10 and OTel Node SDK patch the Express request lifecycle. Running both simultaneously without careful configuration has documented edge cases where Sentry's `setupExpressErrorHandler` misses errors that OTel captures first. This would degrade current error coverage.

**Risk: Transitive dep pollution.** `claude-flow`'s transitive OTel packages may be different versions than a direct install. Installing OTel directly alongside the transitive versions can cause duplicate-SDK warnings and inconsistent trace IDs.

---

## Decision

**DEFERRED.** Revisit only if one or more of these conditions becomes true:

1. APEX is split into microservices (distributed tracing becomes valuable)
2. Sentry proves insufficient for debugging a specific class of production issue
3. A free OTLP-compatible backend is adopted (Grafana Cloud free tier, or similar)
4. A developer with OTel expertise joins the project and takes ownership of the integration

Until then, Sentry v10 remains the sole observability layer. Agent run analytics (apex_agent_stages, tech debt cron) fill the structured monitoring gap without OTel's overhead.
