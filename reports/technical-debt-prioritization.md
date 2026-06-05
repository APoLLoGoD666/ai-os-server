# Technical Debt Prioritization — Phase 26
*Generated: 2026-06-05 | Consolidates all phases*

---

## Scoring Methodology

**ROI Score** = (Risk Reduction + Reliability Gain + Operational Gain) / Implementation Effort

Scale: 1–5 for each factor (5 = highest).

| Item | Risk Reduction | Reliability Gain | Operational Gain | Effort | ROI Score | Priority |
|---|---|---|---|---|---|---|
| Configure UptimeRobot → /health every 14 min | 2 | 5 | 4 | 1 | 11.0 | **HIGHEST** |
| Add Sentry DSN to Render | 3 | 2 | 5 | 1 | 10.0 | **HIGH** |
| Instrument remaining crons with cron-logger | 1 | 2 | 5 | 2 | 4.0 | DONE ✅ |
| Wire agent-pipeline-hooks.js | 1 | 2 | 5 | 1 | 8.0 | DONE ✅ |
| Add complexity routing to master-orchestrator | 1 | 3 | 2 | 3 | 2.0 | MEDIUM |
| Persist event bus AGENT_COMPLETED to Supabase | 1 | 1 | 4 | 4 | 1.5 | MEDIUM |
| Add Mastra status to /health | 1 | 1 | 3 | 2 | 2.5 | MEDIUM |
| Add RLS to documents/memory tables | 2 | 1 | 1 | 2 | 2.0 | LOW |
| Add GitHub token URL hardening | 3 | 1 | 1 | 3 | 1.7 | LOW |
| Remove SQLite fallback (database.js) | 1 | 1 | 2 | 2 | 2.0 | LOW |
| Wire AGENT_PROFILES or remove agents.js | 1 | 1 | 2 | 3 | 1.3 | LOW |
| CSP unsafe-eval removal | 2 | 1 | 1 | 2 | 2.0 | LOW |
| Create .env.example | 1 | 1 | 2 | 1 | 4.0 | LOW |
| Add structured JSON logging | 1 | 1 | 3 | 5 | 1.0 | LOW |
| Add DB query latency tracking | 1 | 1 | 3 | 4 | 1.25 | LOW |
| Add apex_agent_runs retention (90-day) | 1 | 1 | 2 | 2 | 2.0 | LOW |
| Add email_queue/agent_tasks retention | 1 | 1 | 2 | 2 | 2.0 | LOW |
| Add consecutive cron failure alert | 1 | 1 | 3 | 3 | 1.7 | LOW |

---

## Top 10 ROI Items (Ranked)

### 1. Configure UptimeRobot → GET /health every 14 min
**Effort:** 10 min (external service, no code)
**Risk Reduction:** Eliminates Render free-tier spin-down
**Reliability Gain:** Full capability available immediately (Mastra doesn't restart, crons don't restart)
**Operational Gain:** No cold starts, consistent performance
**How:** Create free account at uptimerobot.com → New Monitor → HTTP(S) → URL: `https://ai-os-server-jx20.onrender.com/health` → 14-min interval

---

### 2. Add Sentry DSN to Render
**Effort:** 5 min (Render dashboard, no code)
**Risk Reduction:** External error alerting — catches issues before they become incidents
**Operational Gain:** Error trends, frequency, stack traces — vs. apex_notifications which is text-only
**How:** Create free Sentry account → new project → Node.js → copy DSN → add SENTRY_DSN to Render env vars → redeploy

---

### 3. Wire agent-pipeline-hooks.js ✅ DONE (Phase 23)
**Completed:** orchestrator.js now calls onPipelineStart, onPipelineComplete, onPipelineFailed
**Result:** Slack #apex-agents + Notion Agent Runs now receive pipeline lifecycle events

---

### 4. Instrument remaining crons ✅ DONE (Phase 23)
**Completed:** vault_health, calendar_sync, schedule_fallback, reflection_check now log to apex_sync_checkpoints
**Result:** 8 of 8 meaningful crons now observable

---

### 5. Add complexity routing to master-orchestrator
**Effort:** 1 hour
**Reliability Gain:** "Critical" complexity features (auth, payments, security) use Sonnet/Opus instead of Haiku
**How:** In master-orchestrator.js, check `spec.complexity` in `runAgentTeam()` and select model:
```javascript
const model = spec.complexity === 'critical' ? M.OPUS : spec.complexity === 'complex' ? M.SONNET : M.HAIKU;
```
Not implementing — requires reading master-orchestrator helper functions to understand spec format.

---

### 6. Persist event bus AGENT_COMPLETED to Supabase
**Effort:** 2 hours
**Operational Gain:** Cross-session agent activity replay; post-crash forensics
**How:** In `lib/event-bus.js`, add a Supabase insert in the emit() method for AGENT_COMPLETED/STARTED events

---

### 7. Add Mastra status to /health
**Effort:** 30 min
**Operational Gain:** Operators can see if Mastra is ready without checking logs
**How:** Expose `getMastraStatus()` in the /health endpoint response

---

### 8. RLS on documents/memory tables
**Effort:** 30 min (SQL in supabase-rls.sql or supabase-setup.js)
**Risk Reduction:** Defense-in-depth — prevents accidental anon-key access
**Note:** service_role bypasses RLS; zero functional change

---

### 9. Create .env.example
**Effort:** 10 min
**Operational Gain:** Future onboarding — lists all 28 variable names without values

---

### 10. Add apex_agent_runs retention (90-day cron)
**Effort:** 30 min
**Operational Gain:** Prevents table bloat over months of usage
**How:** Add `DELETE FROM apex_agent_runs WHERE created_at < NOW() - INTERVAL '90 days'` to notification purge cron

---

## Debt by Category

### Zero-Code Changes (highest ROI)
| Item | Effort | Impact |
|---|---|---|
| UptimeRobot setup | 10 min | Eliminates cold starts |
| Sentry DSN on Render | 5 min | External error tracking |

### Low-Code Changes
| Item | Effort | Impact |
|---|---|---|
| Create .env.example | 10 min | Onboarding clarity |
| Mastra status in /health | 30 min | Visibility |
| apex_agent_runs retention | 30 min | DB hygiene |
| email_queue/agent_tasks retention | 30 min | DB hygiene |

### Medium-Code Changes
| Item | Effort | Impact |
|---|---|---|
| master-orchestrator complexity routing | 1 hour | Better model selection |
| Persist event bus to Supabase | 2 hours | Cross-session observability |
| GitHub token URL hardening | 2 hours | Security improvement |
| Remove SQLite legacy | 30 min | Code clarity (verify unused first) |

### High-Effort Changes (low ROI for personal OS)
| Item | Effort | Impact |
|---|---|---|
| Structured JSON logging | 4 hours | Log aggregation quality |
| DB query latency tracking | 4 hours | Performance diagnostics |
| Add correlation IDs to outbound calls | 2 hours | Incident correlation |

---

## Items Completed Through Phase 23

| Phase | Item | Status |
|---|---|---|
| 15 | auth fail-closed | ✅ DONE |
| 15 | POST body validation (3 routes) | ✅ DONE |
| 15 | Supabase→Notion sync wired | ✅ DONE |
| 16 | Notion 30s timeout + circuit breaker | ✅ DONE |
| 16 | Slack 10s timeout + network retry | ✅ DONE |
| 18 | Cron execution history (4 jobs) | ✅ DONE |
| 18 | WebSocket count live | ✅ DONE |
| 18 | CPU telemetry in health log | ✅ DONE |
| 19 | Hardcoded Render URL removed | ✅ DONE |
| 19 | NOTION + SLACK env warnings | ✅ DONE |
| 23 | agent-pipeline-hooks wired | ✅ DONE |
| 23 | 4 more crons instrumented | ✅ DONE |
