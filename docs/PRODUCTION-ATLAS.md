# PRODUCTION ATLAS
## Document 14 of 17 — Production Runtime State
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## PRODUCTION STATUS: GREEN

**As of commit f77a36d (2026-06-16) — CERTIFIED**

---

## COMMIT BASELINE

| Field | Value |
|---|---|
| Certified Commit | f77a36d |
| Date | 2026-06-16 |
| Status | CERTIFIED (passed Phase 29B validation) |
| Health | GREEN |
| Governance Probe | 100/100 (all 10 checks passing) |
| Last Incident | Phase 29B — MODULE_NOT_FOUND (resolved via auto-rollback) |
| Post-incident | Zero downtime; auto-rollback succeeded; fix applied |

---

## SERVICES IN PRODUCTION

| Service | Platform | Status | Notes |
|---|---|---|---|
| ai-os-server | Render | LIVE | Primary Express application, Node.js 22+ |
| apex-ai-sidecar | Render | LIVE (assumed) | Sidecar service per render.yaml |
| Supabase (Postgres) | Supabase cloud | LIVE | ~150 tables, all 27 migrations applied |
| Supabase (Storage) | Supabase cloud | LIVE | SUPABASE_BUCKET configured |

---

## APPLIED FIXES (PRODUCTION AS OF f77a36d)

| Fix ID | Description | Impact |
|---|---|---|
| WS-6A | Memory sanitizer applied on hot path (every pgAddMemory call) | Secrets no longer leak to memory store |
| BD-01 | traceId restored to gateway layer 10 (apex_lessons) | Lesson traceability probe check now passes |
| WS-1B | VALIDATOR fail-closed on exception/parse failure | Non-boolean `passed` coerced to false; parse errors return passed=false |

---

## ACTIVE FEATURES (CONFIRMED FROM CLAUDE.MD)

| Feature | Status |
|---|---|
| AI Chat (/api/chat) | ACTIVE |
| Postgres memory (all 12 layers) | ACTIVE |
| Documents (Supabase Storage) | ACTIVE |
| Agent tasks (orchestrator pipeline) | ACTIVE |
| Agent schedules (node-cron) | ACTIVE |
| Notifications (Slack) | ACTIVE (requires SLACK_BOT_TOKEN) |
| Render cron (/cron/run-schedules) | ACTIVE |
| Autonomy L3 | ACTIVE (AUTONOMY_LEVEL=3) |
| Dashboard (/api/dashboard) | ACTIVE |
| Governance probe | ACTIVE (100/100) |
| Voice pipeline (Gemini) | ACTIVE |
| Civilization runtime | ACTIVE (on-demand) |
| Reality loop | ACTIVE (on-demand, every 4hr) |
| Cognitive crons | ACTIVE (if COGNITIVE_CRONS_ENABLED=true) |

---

## KNOWN PRODUCTION GAPS (OPEN AS OF f77a36d)

| Gap | Detail | Severity |
|---|---|---|
| cognitive-evolution.js MOUNT BUG | Routes at /api/* instead of /api/cognitive-evolution/* | HIGH |
| 3 per-request Supabase clients | governance.js, integrations.js, server.js inline | MEDIUM |
| VALIDATOR empty-testCases bypass | Auto-pass when testCases=[] | MEDIUM |
| VALIDATOR passed=false + empty failedCases | No retry triggered | MEDIUM |
| Login timing attack | Password compare uses !== | HIGH |
| Duplicate requireAppAccess | server.js lines 827-835 vs lib/app-auth.js | LOW |
| Memory layer 4 gap | No handler in gateway.js for layer 4 | LOW |
| Sanitizer coverage gaps | Missing OpenAI, Supabase service role, DB strings, PEM | HIGH |
| Obsidian double-write risk | Legacy direct-insert paths may remain | MEDIUM |
| intelligence.js / intelligence-memory.js namespace | Both at /api/intelligence/* | MEDIUM |
| No OTLP export for otel_spans | Spans stored but not queryable via tools | MEDIUM |
| No anomaly alert routing | Anomalies stored but no notification | MEDIUM |
| MODULE_NOT_FOUND not caught pre-deploy | node --check doesn't catch require() errors | HIGH |

---

## MEMORY SECURITY STATUS

| Check | Status |
|---|---|
| Sanitizer applied on hot path | YES (WS-6A) |
| 10 patterns covered | YES |
| OpenAI keys covered | NO (gap) |
| Supabase service role key covered | NO (gap) |
| DB connection strings covered | NO (gap) |
| PEM blocks covered | NO (gap) |
| Memory → prompt injection risk | OPEN (formatRecentMemory() injected into every chat) |

---

## AGENT AUTONOMY STATUS

| Parameter | Value |
|---|---|
| AUTONOMY_LEVEL | 3 (Full autonomy) |
| Constitutional gate | ACTIVE (checks founder_anti_goal_alerts) |
| Twin gate | ACTIVE (checks digital_twin_simulations) |
| Deploy gate | ACTIVE (checks deployment_policy) |
| Behavior gate | ACTIVE (checks behavioral_modifications) |
| Budget gate | ACTIVE ($2.00 default) |
| VALIDATOR | ACTIVE (static analysis, with fail-open gaps) |
| TESTER | ACTIVE (node --check per file) |

---

## GOVERNANCE STATUS

| Check | Status |
|---|---|
| Governance probe score | 100/100 |
| probe_passed | true |
| Evidence chain (main) | ACTIVE |
| Evidence chain (probe) | ACTIVE |
| Evidence chain (founder) | ACTIVE |
| Certification system | ACTIVE |
| SLO system | ACTIVE |
| Incident management | ACTIVE |
| Policy engine | ACTIVE |
| Cost accounting | ACTIVE |

---

## DATABASE STATUS

| Check | Status |
|---|---|
| Migrations applied | 27/27 |
| Table count | ~150 |
| vault_embeddings dimension | VECTOR(768) (corrected) |
| episodic_memory dimension | VECTOR(768) |
| RLS on documents + memory | ENABLED (setImmediate on startup) |
| Event spine | ACTIVE (migration 024 + 026) |
| write_outbox_with_state() | DEPLOYED (migration 026) |

---

## EXTERNAL INTEGRATION STATUS

| Integration | Status |
|---|---|
| Anthropic Claude API | ACTIVE (CRITICAL dependency) |
| Supabase | ACTIVE (CRITICAL dependency) |
| Render deploy | ACTIVE |
| Google Gemini | ACTIVE (voice pipeline) |
| GitHub (COMMITTER) | ACTIVE |
| Sentry | ACTIVE (if SENTRY_DSN set) |
| Obsidian | ACTIVE (if OBSIDIAN_URL set) |
| Notion | UNKNOWN (requires NOTION_API_KEY) |
| Slack | UNKNOWN (requires SLACK_BOT_TOKEN) |
| Gmail | UNKNOWN (requires Gmail credentials) |
| Firecrawl | UNKNOWN (requires API key) |
| Playwright | UNKNOWN (requires Chromium on Render) |
| Mastra | UNKNOWN (5-min deferred init) |

---

## PRODUCTION RISK REGISTER (PRIORITIZED)

| Priority | Risk | Mitigation Status |
|---|---|---|
| P1 | Login timing attack (password !== instead of timingSafeEqual) | OPEN |
| P1 | Sanitizer missing OpenAI/Supabase service role/PEM patterns | OPEN |
| P1 | MODULE_NOT_FOUND class crashes not caught pre-deploy | OPEN |
| P2 | cognitive-evolution.js routes at wrong paths | OPEN |
| P2 | VALIDATOR fail-open for empty testCases | OPEN |
| P2 | 3 per-request Supabase clients (connection leak) | OPEN |
| P2 | Memory → prompt injection via formatRecentMemory() | OPEN |
| P3 | intelligence.js + intelligence-memory.js namespace collision | OPEN |
| P3 | Duplicate requireAppAccess | OPEN |
| P3 | No alert routing from anomalies table | OPEN |
| P3 | No OTLP export for distributed tracing | OPEN |
| P4 | Memory layer 4 gap | OPEN |
| P4 | Obsidian double-write risk | OPEN |
| P4 | Mastra init uncertain on cold-start | OPEN |

---

## PRODUCTION STRENGTHS

| Strength | Detail |
|---|---|
| Multi-layer memory | 12-layer gateway with sanitization; no raw DB writes |
| Evidence chain | Immutable evidence_blocks for all significant events |
| Governance probe | 10 automated checks; 100/100 score |
| 5 pre-execution gates | All agent actions gated by constitutional, autonomy, twin, deploy, behavior checks |
| Auto-rollback | Phase 29B proved Render auto-rollback works correctly |
| Cost tracking | Per-stage LLM cost accounting with budget gate |
| Certification system | Formal certification status for agents, systems, tasks |
| TraceId propagation | BD-01 fix ensures lesson traceability |
| Working memory uniqueness | Migration 025 prevents duplicate session memory entries |
| Event bus | Postgres-backed outbox with atomic write procedure |
