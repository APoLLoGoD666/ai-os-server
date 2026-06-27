# Phase 20 Baseline
*Generated: 2026-06-05 | Prior phases: 0–19*

---

## Current Production Score: 82/100

| Domain | Score | Last Changed |
|---|---|---|
| Architecture | 9/10 | Phase 0–15 (no change since) |
| Reliability | 8/10 | Phase 16 (+1) |
| Security | 8/10 | Phase 15 (no change since) |
| Observability | 7/10 | Phase 18 (+1) |
| Automation | 9/10 | Phase 0–15 (no change since) |
| Knowledge Integrity | 8/10 | Phase 0–15 (no change since) |
| Agent Operations | 8/10 | Phase 0–15 (no change since) |

---

## Current Risks

### HIGH
| Risk | File | Status |
|---|---|---|
| APP_ACCESS_KEY is `APEX123` — weak password | Render env vars | OPEN — acceptable for personal OS |

### MEDIUM
| Risk | File | Status |
|---|---|---|
| Sentry DSN not set — errors go to apex_notifications only | Render env vars | OPEN |
| Obsidian tunnel must be running for briefings/wiki writes | agent-system/obsidian-client.js | OPEN — no keepalive |
| Mastra 5-min cold start degrades first impression | mastra_agents.js | OPEN |
| master-orchestrator always uses Haiku regardless of complexity | agent-system/master-orchestrator.js:19 | OPEN |
| Event bus 200-event ring buffer — not persisted, no replay | lib/event-bus.js | OPEN |
| No structured logging — all ad-hoc console.warn/error | codebase-wide | OPEN |

### LOW
| Risk | File | Status |
|---|---|---|
| Crons 5–14 fire-and-forget, no execution history | server.js | OPEN |
| RLS missing on `documents` and `memory` tables | supabase-rls.sql | OPEN |
| SQLite fallback (database.js) still imported — legacy | database.js | OPEN |
| agent-pipeline-hooks.js has no consumer | services/pipelines/agent-pipeline-hooks.js | OPEN |
| AGENT_PROFILES (agents.js) never dispatched | agents.js | OPEN |
| No per-external-call correlation IDs | codebase-wide | OPEN |
| 29 unlaunched Supabase tables consuming schema space | supabase-setup.js | INTENTIONAL |
| Render external keepalive not configured | External | OPEN — 10 min to fix |

---

## Current Technical Debt

| Item | Effort | Priority | From Phase |
|---|---|---|---|
| Configure UptimeRobot → /health every 14 min | 10 min | HIGHEST | Phase 13 |
| Add Sentry DSN to Render env vars | 5 min | HIGH | Phase 10 |
| Wire agent-pipeline-hooks.js to checkPendingMasterTasks | 30 min | HIGH | Phase 2 |
| Add cron-logger to remaining 10 crons | 30 min | MEDIUM | Phase 18 |
| Persist AGENT_COMPLETED events to Supabase | 2 hours | MEDIUM | Phase 10 |
| Pass complexity to master-orchestrator | 1 hour | MEDIUM | Phase 5 |
| Add RLS to documents/memory tables | 30 min | LOW | Phase 7 |
| Remove or wire AGENT_PROFILES (agents.js) | 1 hour | LOW | Phase 5 |
| Remove SQLite fallback (database.js) | 30 min | LOW | Phase 7 |
| Create .env.example | 10 min | LOW | Phase 19 |
| Add structured JSON logging | 4 hours | LOW | Phase 12 |
| Add correlation IDs to external calls | 2 hours | LOW | Phase 12 |

---

## Current Operational Gaps

### Observability Gaps
- 10 of 14 crons have no execution history — silent failure possible
- Event bus events exist only in memory — no post-crash replay
- No database query latency instrumentation
- No per-external-call latency (Notion, Slack, Gmail)
- No disk usage monitoring (git worktrees accumulate on Render)
- Gemini/Claude token consumption not exposed in health endpoints
- Sentry inactive — no external error alerting

### Agent Operations Gaps
- agent-pipeline-hooks.js defined but never called — pipeline start/complete events don't fire
- No consecutive-failure counter or alert for individual crons
- AGENT_PROFILES (agents.js) defined but no dispatcher uses them
- Mastra status only via `getMastraStatus()` — not included in /health response

### Security Gaps
- Missing RLS on `documents` and `memory` tables (service-role only, low risk)
- No per-route rate limits on mutation routes (acceptable for single-user)
- Some POST routes still have unvalidated query parameters (domain, category)
- No automatic secret rotation capability

### Reliability Gaps
- Gmail: no timeout, no retry, manual token refresh
- Obsidian: no retry, no timeout, no circuit breaker
- GitHub: no timeout, no retry
- No correlation IDs on outbound calls to any external service

### Architecture Gaps
- 31 PARTIAL components (mostly CLI utilities and deferred systems — not production risks)
- cloud_autopilot.js role unclear relative to main pipeline
- SQLite fallback confusion with primary Supabase path

---

## Summary: What Was Accomplished Through Phase 19

| Phase | What Changed |
|---|---|
| 15 | auth fail-closed, 3 POST validations, sync wired, NOTION_API_KEY + SLACK_BOT_TOKEN added |
| 16 | Notion 30s timeout + circuit breaker; Slack 10s timeout + network error retry |
| 17 | Circuit breaker audit — Notion CB justified, others documented as not needed |
| 18 | 4 crons instrumented, WS count live, CPU telemetry |
| 19 | Hardcoded URL removed, NOTION + SLACK env warnings added, 28-variable secret inventory |
