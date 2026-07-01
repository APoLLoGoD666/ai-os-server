# DEAD CODE ATLAS
## Document 13 of 17 — Live, Dead, and Unknown Artifact Status
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## CLASSIFICATION SYSTEM

| Status | Definition |
|---|---|
| DEAD | Definitively not active in production; confirmed never executes |
| SUSPECT | Likely inactive but cannot be confirmed without runtime traffic data |
| UNKNOWN | Insufficient evidence to determine live/dead status |
| LIVE | Confirmed active in production based on evidence |

---

## DEFINITIVELY DEAD ARTIFACTS

### 1. vault_embeddings VECTOR(1536) Schema

| Field | Value |
|---|---|
| Artifact | VECTOR(1536) column on vault_embeddings table |
| Created in | Migration 001 |
| Killed in | Migration 002 — DROP TABLE + RECREATE as VECTOR(768) |
| Evidence | Migration 002 explicitly drops and recreates vault_embeddings |
| Production data at death | None (migration 001 → 002 sequence; no data had been inserted to 1536 version) |
| Current state | vault_embeddings exists with VECTOR(768) |
| Status | DEAD (1536-dimension version never held data) |

---

### 2. Migration 014 (Intentional No-Op)

| Field | Value |
|---|---|
| Artifact | migrations/014_*.sql |
| Content | `SELECT 1;` only — no structural changes |
| Purpose | Intentional placeholder (gap in sequence) |
| Evidence | Migration content confirmed as no-op |
| Impact | Zero — runs successfully without effect |
| Status | DEAD (no-op) |

---

### 3. cognitive-evolution.js Mount Comment

| Field | Value |
|---|---|
| Artifact | Comment in routes/cognitive-evolution.js: "Mounted at /api/cognitive-evolution" |
| Evidence | _loadAgentRoutes() mounts ALL auto-loaded files at /api/, not at their router prefix |
| Reality | All routes resolve at /api/ (e.g., /api/attribution/impact, not /api/cognitive-evolution/attribution/impact) |
| Impact | Documentation mismatch causes developer confusion; clients calling /api/cognitive-evolution/* get 404 |
| Status | DEAD comment (misleading, not accurate) |

---

### 4. Duplicate requireAppAccess (server.js lines 827-835)

| Field | Value |
|---|---|
| Artifact | Inline `requireAppAccess` function in server.js lines 827-835 |
| Canonical | lib/app-auth.js |
| Evidence | Two implementations confirmed in census |
| Risk | Silent drift — if lib/app-auth.js is updated, server.js inline copy remains stale |
| Status | SUSPECT DEAD (duplicate; canonical in lib/app-auth.js should be sole implementation) |

---

### 5. Memory Gateway Layer 4

| Field | Value |
|---|---|
| Artifact | Layer 4 in gateway.js dispatch |
| Evidence | Gateway handles layers 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12. Layer 4 has no case. |
| Impact | gateway.storeMemory(layer: 4) silently fails or throws unhandled case |
| Associated table | None assigned to layer 4 |
| Status | DEAD (gap — no handler, no table, never functional) |

---

### 6. BYPASS_DASHBOARD_AUTH Capability

| Field | Value |
|---|---|
| Artifact | BYPASS_DASHBOARD_AUTH env var behavior in server.js |
| Function | If set to 'true', skips requireAuth on /api/dashboard |
| Status | LIVE in code but should be DEAD in production config |
| Risk | If accidentally set in Render env vars, exposes dashboard publicly |
| Recommendation | Remove from code or add explicit warning; never set in production |
| Classification | DANGEROUS capability — treat as dead/removed |

---

### 7. Global Variables (Written but Never Externally Read)

| Variable | Location | Notes |
|---|---|---|
| latestAgentPlan | server.js (inferred) | Written by agent handler; not exposed via any endpoint beyond its own handler scope |
| pendingDuplicateDecision | server.js (inferred) | Written by deduplication logic; not returned or used by other handlers |
| latestAgentCleanupPreview | server.js (inferred) | Written by cleanup preview handler; scoped to handler only |

**Status:** SUSPECT DEAD — variables are written but appear to serve no purpose outside their own handler. May be debugging artifacts from development. Cannot confirm without code inspection.

---

## UNKNOWN STATUS ARTIFACTS

### 1. services/pipelines/ (Daily Briefing, Weekly Review, Lead Pipeline)

| Field | Value |
|---|---|
| Files | services/pipelines/daily-briefing.js, weekly-review.js, lead-pipeline.js (inferred) |
| Callable | YES — routes exist to trigger |
| Scheduled | UNKNOWN — no confirmed cron schedule for these specific pipelines |
| Dependency | Requires Notion/Slack credentials to deliver output |
| Status | UNKNOWN |

---

### 2. services/notion/ Integration

| Field | Value |
|---|---|
| Files | services/notion/*.js |
| Callable | YES — routes/integrations.js triggers Notion sync |
| Active | UNKNOWN — requires NOTION_API_KEY env var |
| Status | UNKNOWN (credential-dependent) |

---

### 3. services/slack/ Integration

| Field | Value |
|---|---|
| Files | services/slack/*.js |
| Callable | YES — routes/communications.js triggers Slack sends |
| Active | UNKNOWN — requires SLACK_BOT_TOKEN env var |
| Status | UNKNOWN (credential-dependent) |

---

### 4. agent-system/langchain-rag.js

| Field | Value |
|---|---|
| File | agent-system/langchain-rag.js |
| Load type | Lazy-loaded |
| Activation | Only if voice-chat feature is used |
| Status | UNKNOWN — active only if voice-chat invoked |

---

### 5. Mastra Integration

| Field | Value |
|---|---|
| Files | lib/mastra*.js (inferred) |
| Load type | Deferred — setTimeout(5 minutes) after server startup |
| Risk | If Render cold-starts and no traffic in first 5min, Mastra init may never complete |
| Status | UNKNOWN — deferred init; production usage not confirmed |

---

### 6. Playwright Browser Integration

| Field | Value |
|---|---|
| Files | lib/browser*.js (inferred) |
| Load type | Lazy-loaded |
| Activation | Only for /api/browser/* routes or RESEARCHER stage fallback |
| Render risk | Playwright requires Chromium binary; may not be available on Render standard tier |
| Status | UNKNOWN |

---

## CONFIRMED LIVE ARTIFACTS

| Artifact | Evidence |
|---|---|
| All 27 migration files (001-027) | Applied to Supabase Postgres; schema reflects all 27 |
| server.js | Production entry point; all traffic flows through it |
| lib/memory/gateway.js | Active write path for all 12 memory layers |
| lib/memory/sanitizer.js | Applied on every pgAddMemory hot path (WS-6A) |
| agent-system/orchestrator.js | Active pipeline runner; Phase 29B confirmed running |
| governance-probe.js | 10/10 checks passing (100/100 score) |
| All 23 route files | Registered in Express; all receive HTTP requests |
| pg_database.js | Direct SQL pool; active for event bus and stored procedures |
| lib/clients.js | Singleton hub; required by virtually all modules |
| lib/event-bus.js | Phase 0a event spine; writes to outbox table |
| lib/app-auth.js | Auth middleware; applied globally |
| routes/operations.js | Health check endpoints respond to Render health probes |
| migrations/024 (events/outbox/consumer_offsets) | Written by event bus; confirmed by schema |
| migrations/025 (working_memory UNIQUE constraint) | Applied; enforced in DB |
| migrations/026 (write_outbox_with_state stored proc) | Called by event bus |
| migrations/027 (note TEXT on runs/stages) | Applied; column exists |

---

## DEAD CODE SUMMARY TABLE

| Artifact | Type | Status | Risk if Kept |
|---|---|---|---|
| vault_embeddings VECTOR(1536) | Schema version | DEAD | None (already replaced) |
| Migration 014 | Migration file | DEAD (no-op) | None (harmless) |
| cognitive-evolution.js mount comment | Code comment | DEAD | Developer confusion |
| server.js requireAppAccess (lines 827-835) | Duplicate function | SUSPECT DEAD | Silent drift from canonical |
| Gateway layer 4 handler | Gateway case | DEAD | Silent write failure if layer 4 requested |
| BYPASS_DASHBOARD_AUTH capability | Auth bypass | Dangerous (treat as dead) | Auth bypass if env var set |
| latestAgentPlan global | Global variable | SUSPECT DEAD | Memory leak if large objects |
| pendingDuplicateDecision global | Global variable | SUSPECT DEAD | Memory leak |
| latestAgentCleanupPreview global | Global variable | SUSPECT DEAD | Memory leak |

---

## RECOMMENDATIONS

| Priority | Action |
|---|---|
| HIGH | Fix cognitive-evolution.js mount — add router prefix so routes resolve correctly |
| HIGH | Remove server.js requireAppAccess duplicate (lines 827-835) — use lib/app-auth.js only |
| HIGH | Add gateway layer 4 handler OR document that layer 4 is intentionally skipped |
| MEDIUM | Audit and remove latestAgentPlan, pendingDuplicateDecision, latestAgentCleanupPreview globals |
| MEDIUM | Remove or explicitly gate BYPASS_DASHBOARD_AUTH in production configs |
| LOW | Remove or annotate migration 014 placeholder |
| LOW | Fix cognitive-evolution.js mount comment to reflect actual behavior until fix |
