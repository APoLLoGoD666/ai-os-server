# OBSERVABILITY ATLAS
## Document 11 of 17 — All Monitoring, Logging, Alerting, Tracing
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## OBSERVABILITY OVERVIEW

APEX AI OS implements layered observability combining external error tracking (Sentry), database-backed logging tables, agent audit logging, governance probes, and a self-check diagnostic endpoint.

**No external distributed tracing system confirmed.** Tracing is handled via trace IDs stored in database tables and otel_spans table (no live OTLP export confirmed).

---

## OBSERVABILITY COMPONENTS

| Component | Type | Location | Tables | Status |
|---|---|---|---|---|
| Sentry | Error tracking + APM | @sentry/node | External (Sentry SaaS) | LIVE |
| request_logs | HTTP access log | server.js middleware | request_logs | LIVE |
| otel_spans | OpenTelemetry spans (DB-stored) | lib/governance*.js | otel_spans | LIVE |
| apex_agent_runs / apex_agent_stages | Agent audit log | orchestrator.js | apex_agent_runs, apex_agent_stages | LIVE |
| cost_accounting | LLM cost tracking | orchestrator.js | cost_accounting | LIVE |
| governance_probes | 10-check probe results | governance-probe.js | governance_probes | LIVE |
| cron_logs | Cron execution history | cron handlers | cron_logs | LIVE |
| lib/latency-tracker | Voice session latency | lib/latency-tracker.js | (in-memory + SLO feed) | LIVE |
| lib/counter.js | Request counter | lib/counter.js | (in-memory) | LIVE |
| /api/intelligence/self-check | 9-subsystem diagnostics | routes/intelligence.js | Multiple | LIVE |
| runtime-readiness scorecard | Readiness scoring | routes/operations.js | Multiple | LIVE |
| evidence-completeness scoring | Evidence coverage | routes/operations.js | evidence_blocks | LIVE |
| anomalies table | Anomaly detection storage | lib/governance*.js | anomalies | LIVE (no alert routing) |

---

## SENTRY ERROR TRACKING

| Field | Value |
|---|---|
| Package | @sentry/node |
| Config env | SENTRY_DSN |
| Scope | Unhandled exceptions, Express errors |
| Integration | Registered as Express middleware in server.js |
| Alert routing | Sentry SaaS (email/Slack via Sentry config) |
| Limitations | Only catches unhandled errors; silent failures not reported |

---

## REQUEST LOGGING (request_logs)

**Table:** `request_logs` (migration 004)
**Written by:** server.js middleware (requestLogger function)
**Every HTTP request logged with:**

| Column | Value |
|---|---|
| method | HTTP method (GET, POST, etc.) |
| path | Request path |
| status | HTTP response status code |
| duration_ms | Request processing time |
| timestamp | Request receipt timestamp |
| (user_id / session) | If available from JWT |

**Route to read:** GET /api/operations/logs (authenticated)
**Volume risk:** High-traffic production will accumulate millions of rows. No confirmed rotation/archival policy.

---

## OPENTELEMETRY SPANS (otel_spans)

**Table:** `otel_spans` (migration 005)
**Written by:** lib/governance*.js during significant operations
**Storage:** Database-only (no confirmed OTLP exporter to Jaeger/Tempo/etc.)

| Column | Purpose |
|---|---|
| id | UUID |
| trace_id | Distributed trace identifier |
| span_id | Span identifier |
| operation | Operation name |
| duration_ms | Span duration |
| attributes | Span attributes JSON |
| created_at | Span start timestamp |

**Gap:** No confirmed live OTLP export. Spans are stored in Postgres but cannot be queried via standard observability tools (Jaeger, Grafana Tempo, etc.) without custom tooling.

---

## AGENT AUDIT LOG

**Tables:** `apex_agent_runs`, `apex_agent_stages`
**Written by:** orchestrator.js on every pipeline execution
**Extended by:** migration 027 (added `note TEXT` to both tables)

### apex_agent_runs (one row per pipeline run)

| Column | Purpose |
|---|---|
| id | Run UUID |
| task_id | Originating task |
| trace_id | Distributed trace |
| status | running / completed / failed |
| cost_usd | Total LLM cost |
| note | Human-readable note |
| started_at | Pipeline start |
| completed_at | Pipeline end |

### apex_agent_stages (one row per stage per run)

| Column | Purpose |
|---|---|
| id | Stage UUID |
| run_id | References apex_agent_runs |
| stage | Stage name (RESEARCHER, ARCHITECT, DEVELOPER, REVIEWER, VALIDATOR, TESTER, COMMITTER) |
| status | pending / running / passed / failed |
| output | Stage JSON output |
| note | Human-readable note |
| started_at | Stage start |
| completed_at | Stage end |

**Route to read:** GET /api/agents/:id/runs, GET /api/agents/runs/:runId

---

## LLM COST ACCOUNTING

**Table:** `cost_accounting` (migration 005)
**Written by:** orchestrator.js per pipeline stage
**Governance probe check #2:** Verifies tokens_in=100 AND tokens_out=50 for synthetic probe

| Column | Purpose |
|---|---|
| id | UUID |
| task_id | Task context |
| stage | Pipeline stage |
| tokens_in | Input token count |
| tokens_out | Output token count |
| cost_usd | Calculated USD cost |
| model | Claude model used |
| timestamp | Accounting timestamp |

**Budget enforcement:** `ctx.costUsd` tracked in pipeline context; exceeds `PIPELINE_BUDGET_USD` → pipeline abort.

---

## GOVERNANCE PROBE MONITORING

**Runner:** governance-probe.js
**Results table:** governance_probes
**Threshold:** 80% pass rate → `probe_passed=true`
**Current state:** 100/100 (as of f77a36d)

| Column | Purpose |
|---|---|
| id | UUID |
| score | Numeric score (100 = 10/10) |
| results_json | Per-check results detail |
| probe_passed | Boolean (true if >= 80%) |
| run_at | Probe execution timestamp |

**Route:** POST /api/governance/probe (trigger), GET /api/governance/probe/latest (read)

---

## CRON EXECUTION LOG

**Table:** `cron_logs` (migration 001)
**Written by:** All cron handler functions on each execution

| Column | Purpose |
|---|---|
| id | UUID |
| job_name | Cron job identifier |
| status | success / failed |
| duration_ms | Job execution time |
| output | Job output/result |
| ran_at | Execution timestamp |

**Route to read:** GET /api/operations/logs

---

## VOICE LATENCY TRACKING

**Module:** `lib/latency-tracker.js`
**Purpose:** Per-session voice latency measurement for SLO compliance
**Storage:** In-memory (session-scoped) + feeds into SLO measurements table
**Metrics tracked:**
- Time-to-first-audio (TTFA)
- Round-trip latency
- Buffer fill time

**Route:** SLO data visible via GET /api/governance/slo/measurements

---

## REQUEST COUNTER

**Module:** `lib/counter.js`
**Purpose:** Simple in-memory request counter
**Reset:** On server restart (no persistence)
**Exposed via:** GET /api/metrics (UNAUTHENTICATED)
**Metrics:**
- Total requests since startup
- Requests by route/method (if implemented)

---

## SELF-CHECK DIAGNOSTIC (9 Subsystems)

**Route:** GET /api/intelligence/self-check (authenticated)
**Purpose:** Runtime diagnostic checking 9 subsystems for operational health

| # | Subsystem Checked | Check Type |
|---|---|---|
| 1 | Database connectivity | Supabase ping |
| 2 | Memory gateway | Layer write/read test |
| 3 | Agent pipeline | Orchestrator readiness |
| 4 | Governance probe | Latest probe score check |
| 5 | Intelligence layer | Knowledge ingestion status |
| 6 | Civilization runtime | Runtime active check |
| 7 | Voice pipeline | Gemini connection check |
| 8 | External integrations | Notion/Slack connectivity |
| 9 | Event bus | Event spine connectivity |

**Output:** JSON with per-subsystem status, overall health score

---

## RUNTIME READINESS SCORECARD

**Route:** GET /api/operations/runtime-readiness (authenticated)
**Purpose:** Multi-dimensional readiness scoring for production health

Likely dimensions (inferred from evidence):
- Database tables all present
- All migrations applied
- Governance probe passing
- Agent pipeline gates functional
- Memory layers responsive
- Auth handlers configured

---

## EVIDENCE COMPLETENESS SCORING

**Route:** GET /api/operations/evidence-completeness (authenticated)
**Purpose:** Measures coverage of evidence_blocks chain — what percentage of auditable events have evidence blocks.

**Sources:** evidence_blocks table chain completeness analysis

---

## OBSERVABILITY GAPS

| Gap | Severity | Detail |
|---|---|---|
| No live OTLP export | MEDIUM | otel_spans stored in DB but not queryable via Jaeger/Tempo/Grafana |
| No alert routing from anomalies table | MEDIUM | anomalies populated by governance but no PagerDuty/Slack alert confirmed |
| No PagerDuty or alert manager integration | MEDIUM | Incidents created in DB but no active notification routing confirmed |
| request_logs table rotation | LOW | No confirmed archival/rotation; will grow unbounded |
| Sentry only catches unhandled exceptions | LOW | Silent failures (caught errors that return HTTP 500) may not reach Sentry |
| lib/counter.js resets on restart | LOW | Metrics counter loses history on Render redeploy |
| No application-level tracing spans | MEDIUM | Trace IDs propagated through code but no distributed trace visualization |
| No real-time alerting on SLO violations | MEDIUM | slo_violations populated but no active notification routing |

---

## OBSERVABILITY COVERAGE MATRIX

| What | Covered? | Where |
|---|---|---|
| Unhandled exceptions | YES | Sentry |
| HTTP access logs | YES | request_logs |
| Agent pipeline execution | YES | apex_agent_runs, apex_agent_stages |
| LLM costs | YES | cost_accounting |
| Governance events | YES | evidence_blocks, governance tables |
| Cron execution | YES | cron_logs |
| Memory writes | PARTIAL | gateway logs (no dedicated write log table) |
| Voice latency | YES | latency-tracker → SLO measurements |
| Active incidents | YES | incidents table |
| SLO breaches | YES | slo_violations (stored; no active alert) |
| Anomaly detection | PARTIAL | anomalies table (stored; no active alert) |
| Deployment events | YES | deployment_events |
| Distributed traces | PARTIAL | otel_spans (DB only; no live export) |
| Security events | UNKNOWN | No dedicated security event log confirmed |
