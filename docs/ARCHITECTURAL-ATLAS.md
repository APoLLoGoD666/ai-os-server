# APEX ARCHITECTURAL ATLAS
## Document 1 of 17 — High-Level System Overview
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## SYSTEM IDENTITY

| Field | Value |
|---|---|
| Name | APEX AI OS |
| Hosting | Render (Node.js web service) |
| Runtime | Node.js 22+ |
| Framework | Express 5.x |
| Primary Database | Supabase Postgres |
| Object Storage | Supabase Storage |
| AI Provider | Anthropic Claude API |
| Entry Point | server.js (~12,300 lines, ~515KB) |
| Git-Tracked Files | ~1,097 |
| Production Commit | f77a36d |

---

## HIGH-LEVEL ARCHITECTURE DESCRIPTION

APEX AI OS is a **personal AI operating system** deployed as a single Node.js/Express monolith on Render. It provides a unified interface for an AI founder OS: managing tasks, memory, governance, agents, civilizational simulations, cognitive evolution, and external integrations (Notion, Slack, Obsidian, Google APIs, GitHub).

The system is structured around a **multi-layer memory architecture** (12 active layers, gateway-routed), a **6-stage agentic execution pipeline** (orchestrator.js), and a **10-check governance probe** that certifies system health. All state is persisted to Supabase Postgres (~150 tables) and Supabase Storage.

The codebase is a **monolith with internal module separation**: server.js is the HTTP entry point and routes loader, delegating to 23 route files, 100+ lib/ modules, and 15+ agent-system/ files.

---

## CORE SUBSYSTEM INVENTORY

| Subsystem | Location | Description |
|---|---|---|
| HTTP Server / Monolith | server.js | Express entry point; mounts all 23 route files, defines ~35 inline routes |
| Agent Orchestrator | agent-system/orchestrator.js | 6-stage pipeline runner (RESEARCHER → COMMITTER) with 5 pre-execution gates |
| Memory Gateway | lib/memory/gateway.js | Routes all memory reads/writes across 12 numbered layers |
| Memory Sanitizer | lib/memory/sanitizer.js | Scrubs 10 secret patterns before write; active on hot path |
| Governance Engine | lib/governance*.js | Evidence chains, certifications, SLO, policies, incidents, probe runner |
| Governance Probe | governance-probe.js | 10-check automated verification; 80% threshold; current 100/100 |
| Civilization Runtime | agent-system/ (civilization) | Continuous simulation of "civilization health" |
| Reality Loop | agent-system/ | Every-4hr reflection and alignment cycle |
| Cognitive Layer | routes/cognitive.js, routes/cognitive-evolution.js | Cognitive policy, behavioral modification, autonomy decisions |
| Intelligence Layer | routes/intelligence.js, routes/intelligence-memory.js | Knowledge ingestion, self-check, news refresh |
| Founder OS | routes/founder.js, routes/founder-graph.js | Founder memory, goals, anti-goal alerts, knowledge graph |
| Empire | routes/empire.js, lib/empire/ | Empire health scores, empire graph nodes/edges |
| Executive Layer | routes/executive-performance.js | Executive decisions, deliberations, votes, strategy |
| Event Bus | lib/event-bus.js, migration 024 | Postgres-backed outbox/events/consumer_offsets (Phase 0a spine) |
| Supabase JS Client | lib/clients.js (singleton) | Primary database access for most reads/writes |
| pg Pool | pg_database.js | Direct Postgres pool for raw SQL (dual access pattern) |
| Supabase Storage | lib/clients.js + routes | File/document storage via Supabase Storage bucket |
| Obsidian Integration | obsidian-memory.js | Lesson logging bridge to Obsidian vault |
| Slack Integration | services/slack/ | Notification delivery |
| Notion Integration | services/notion/ | Sync checkpoints, contact/project sync |
| Voice Pipeline | routes/gemini-live.js, routes/tts-gemini.js | Real-time voice via Gemini Live + TTS |
| Mastra Integration | lib/ (deferred) | 5-min deferred init; status UNKNOWN in production |
| LangChain/RAG | agent-system/langchain-rag.js | Lazy-loaded; active only if voice-chat in use |
| Playwright Browser | lib/ (lazy) | Browser automation; lazy-loaded for /api/browser/* |
| Auth System | lib/app-auth.js + server.js | 3-layer auth: JWT, API key, cron secret |
| Task Router | runtime/task-router.js | Routing entry for agent task dispatch |

---

## DATA FLOW SUMMARY

```
HTTP Request
    │
    ▼
Express middleware (Sentry, body-parse, cors, requestLogger)
    │
    ▼
Auth layer (requireAuth → JWT/x-api-key check)
    │
    ▼
Route handler (server.js inline OR routes/*.js file)
    │
    ├─── Read path: lib/memory/gateway.js → Supabase JS client → Postgres table
    │
    ├─── Write path: lib/memory/sanitizer.js → gateway.js → Supabase JS client → Postgres table
    │                                                      └──→ evidence_blocks audit (layers 0, 11)
    │
    ├─── Agent path: orchestrator.js → 5 pre-gates → 6 pipeline stages → governance writes
    │
    ├─── Event path: lib/event-bus.js → outbox table → consumer_offsets (Postgres-backed)
    │
    └─── External: Anthropic API, Supabase Storage, Notion, Slack, Google APIs, GitHub
    │
    ▼
HTTP Response (JSON)
```

---

## PRODUCTION BASELINE

- **Commit:** f77a36d (CERTIFIED 2026-06-16)
- **Status:** GREEN — Phase 29B incident resolved, zero downtime achieved
- **Governance Probe:** 100/100 (all 10 checks passing)
- **Migrations Applied:** 001 through 027 (all 27)
- **Active Fixes:** WS-6A (sanitizer hot path), BD-01 (traceId restored), WS-1B (VALIDATOR fail-closed)

---

## KEY ARCHITECTURAL CHARACTERISTICS

| Characteristic | Detail |
|---|---|
| Architecture pattern | Monolith with internal module separation |
| Memory model | 12-layer gateway-routed memory (working → episodic → strategic → founder) |
| Agent model | 6-stage pipeline with pre-execution gate battery |
| Governance model | Evidence-chain audit + 10-check probe + SLO + certification system |
| Database access | Dual: Supabase JS client (primary) + pg Pool (direct SQL) |
| Event system | Postgres-backed outbox (Phase 0a event spine, migration 024) |
| Auth model | 3-layer: JWT cookie, API key header, cron secret |
| Deployment | Render auto-deploy on git push; ~145s deploy time |
| Vector embeddings | VECTOR(768) in episodic_memory; vault_embeddings also VECTOR(768) after migration 002 |
| Observability | Sentry + request_logs + otel_spans + governance_probes + apex_agent_runs |

---

## CRITICAL RISKS

| Risk | Severity | Status |
|---|---|---|
| cognitive-evolution.js mount bug — routes at /api/ not /api/cognitive-evolution/ | HIGH | OPEN |
| 3 per-request Supabase client instantiations | MEDIUM | OPEN |
| VALIDATOR fail-open for empty testCases | MEDIUM | OPEN (WS-1B partial) |
| Duplicate requireAppAccess implementation | LOW | OPEN |
| Memory layer 4 gap in gateway dispatch | LOW | OPEN |
| Login password comparison uses !== (not timingSafeEqual) | HIGH | OPEN |
| intelligence.js + intelligence-memory.js share /api/intelligence/* namespace | MEDIUM | OPEN |

---

## 10 KEY ARCHITECTURAL FINDINGS

1. **MOUNT BUG (cognitive-evolution.js):** Routes defined as `/attribution/impact` become `/api/attribution/impact` — NOT `/api/cognitive-evolution/attribution/impact`. The comment `"Mounted at /api/cognitive-evolution"` is false. These routes may collide with other files.

2. **Per-request Supabase clients (3 confirmed):** `routes/governance.js` lines 12-14, `routes/integrations.js` line 122-123, and one inline handler in `server.js` each call `createClient()` on every request, bypassing the singleton pattern and leaking connections.

3. **VALIDATOR fail-open residual:** When `passed:false` is returned with an empty `failedCases[]` array, the dispatch gate condition (`!passed AND failedCases.length > 0`) is not fully met and no retry is triggered. Static analysis only — no runtime error detection.

4. **vault_embeddings dimension mismatch corrected:** Migration 001 created `VECTOR(1536)`. Migration 002 DROPPED and RECREATED as `VECTOR(768)`. The 1536-dimension version never held production data; the dimension is now 768 everywhere.

5. **Dual Postgres access pattern:** Both the Supabase JS client (`lib/clients.js`) and a direct `pg` Pool (`pg_database.js`) are active in production. Both write to the same database. No transaction coordination between them.

6. **Duplicate requireAppAccess:** The canonical implementation is `lib/app-auth.js`. An identical inline re-declaration exists in `server.js` lines 827-835. These can drift apart silently.

7. **VALIDATOR is static-analysis only:** The VALIDATOR stage runs `node --check` for syntax and Zod schema validation but cannot catch runtime errors, logical bugs, or integration failures.

8. **Memory gateway layer 4 gap:** The gateway.js dispatch handles layers 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12. Layer 4 is absent. Writes targeting layer 4 will silently fall through or error.

9. **Obsidian double-write risk:** `obsidian-memory.js logLesson()` calls `gateway.storeMemory(layer:10)` which calls `_storeLesson()`. If any legacy direct-insert code paths to `apex_lessons` remain, lessons may be double-written.

10. **intelligence.js / intelligence-memory.js namespace collision:** Both route files mount under `/api/intelligence/*`. Express serves the first-loaded file first for any path conflict. Ordering is load-order-dependent.
