# DIRECTORY CENSUS
## Document 2 of 17 — Complete Directory Tree with File Counts
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## TOP-LEVEL DIRECTORY SUMMARY

| Directory | Purpose | Owner Subsystem | Production Status | File Count (est.) |
|---|---|---|---|---|
| agent-system/ | Agent pipeline, memory, orchestration | Agent Orchestrator | LIVE | 15+ files |
| lib/ | All shared modules, engines, clients | All subsystems | LIVE | 100+ files |
| routes/ | Express route handlers (23 files) | HTTP Server | LIVE | 23 files |
| migrations/ | SQL schema migrations (27 files) | Database | LIVE | 27 SQL + 1 JS = 28 files |
| services/ | External service integrations | Integration Layer | PARTIALLY LIVE | ~10 files |
| runtime/ | Task routing entry point | Agent Orchestrator | LIVE | 1 file |
| (root) | server.js entry point, config, package.json | HTTP Server | LIVE | ~10 files |

**Total Git-tracked files:** ~1,097

---

## DETAILED DIRECTORY BREAKDOWN

### / (Root)
**Purpose:** Application entry point, configuration, dependencies
**Owner:** HTTP Server / Monolith
**Production Status:** LIVE

| File | Purpose | Status |
|---|---|---|
| server.js | Express app, ~12,300 lines, ~515KB, mounts all routes | LIVE |
| package.json | Dependencies, scripts, Node version | LIVE |
| render.yaml | Render deployment config (2 services) | LIVE |
| pg_database.js | Direct pg Pool connection to Supabase Postgres | LIVE |
| obsidian-memory.js | Obsidian lesson logging bridge | LIVE |
| governance-probe.js | 10-check automated governance verification | LIVE |
| (others) | Config files, .env templates, etc. | MIXED |

---

### agent-system/ (15+ files)
**Purpose:** Agent pipeline execution, memory subsystems, adaptation, reputation
**Owner:** Agent Orchestrator
**Production Status:** LIVE

| File | Purpose | Status |
|---|---|---|
| orchestrator.js | 6-stage pipeline runner, 5 pre-execution gates | LIVE |
| pipeline/ | Per-stage pipeline modules (researcher, architect, developer, reviewer, validator, tester, committer) | LIVE |
| memory.js | Agent-level memory interface | LIVE |
| reputation.js | Agent reputation events, scoring | LIVE |
| adaptation.js | Adaptation engine, behavioral feedback | LIVE |
| agent-pipeline-hooks.js | Pre/post pipeline hook system | LIVE |
| dynamic-agent-selector.js | Agent profile selection logic | LIVE |
| execution-verifier.js | Post-execution verification | LIVE |
| langchain-rag.js | LangChain RAG pipeline for voice chat | UNKNOWN (lazy-loaded) |
| (others) | Supporting agent modules | LIVE |

---

### lib/ (100+ modules)
**Purpose:** All shared business logic, engines, clients, integrations
**Owner:** Multiple subsystems
**Production Status:** LIVE (majority); UNKNOWN (minority)

#### lib/memory/ (memory layer modules)
| File | Purpose | Status |
|---|---|---|
| gateway.js | 12-layer memory router, primary write path | LIVE |
| sanitizer.js | Secret scrubbing, 10 patterns | LIVE |
| working-memory.js | Layer 1 — session working memory | LIVE |
| episodic-memory.js | Layer 2 — vector episodic memory | LIVE |
| procedural-memory.js | Layer 3 — procedural memory | LIVE |
| strategic-memory.js | Layer 5 — strategic memory | LIVE |
| skill-memory.js | Layer 6 — skill memory | LIVE |
| decision-memory.js | Layer 7 — decision memory | LIVE |
| knowledge-graph.js | Layer 8 — knowledge graph nodes | LIVE |
| semantic-memory.js | Layer 9 — semantic memory | LIVE |
| reflexion.js | Layer 11 — reflexion records | LIVE |
| improvement.js | Layer 12 — improvement candidates | LIVE |
| (layer 0, founder) | Layer 0 — founder_memory | LIVE |
| (layer 10, lessons) | Layer 10 — apex_lessons direct insert | LIVE |

#### lib/clients.js
**Purpose:** Supabase JS singleton, Anthropic client factory
**Status:** LIVE — required by most files

#### lib/governance*.js
**Purpose:** Evidence chains, certifications, SLO, policies, incidents, audit
**Status:** LIVE

#### lib/cognitive/
**Purpose:** Cognitive policy decisions, behavioral modification, autonomy
**Status:** LIVE

#### lib/intelligence/
**Purpose:** Knowledge ingestion, news refresh, self-check diagnostics
**Status:** LIVE

#### lib/empire/
**Purpose:** Empire health scores, empire graph
**Status:** LIVE

#### lib/founder/
**Purpose:** Founder OS logic, goals, anti-goal detection
**Status:** LIVE

#### lib/app-auth.js
**Purpose:** requireAppAccess middleware (canonical implementation)
**Status:** LIVE (duplicate exists in server.js lines 827-835)

#### lib/latency-tracker.js
**Purpose:** Voice session latency tracking
**Status:** LIVE (voice pipeline)

#### lib/counter.js
**Purpose:** Request counter for /api/metrics
**Status:** LIVE

#### lib/event-bus.js
**Purpose:** Postgres-backed event outbox
**Status:** LIVE (Phase 0a event spine)

#### lib/agent-queue.js
**Purpose:** Agent task queueing
**Status:** LIVE

#### lib/ (other modules — estimated 60+ additional)
| Category | Examples | Status |
|---|---|---|
| Mastra | lib/mastra*.js | UNKNOWN (deferred init) |
| Playwright | lib/browser*.js | UNKNOWN (lazy-loaded) |
| LangChain | lib/langchain*.js | UNKNOWN (lazy-loaded) |
| Voice | lib/voice*.js | LIVE (if voice used) |
| Utils | lib/utils.js, lib/helpers.js, etc. | LIVE |

---

### routes/ (23 files)
**Purpose:** Express route handlers, loaded by server.js
**Owner:** HTTP Server
**Production Status:** LIVE (all 23 registered)

#### Auto-Loaded Routes (21 files via _loadAgentRoutes)
| File | Mount Point | Route Count | Status |
|---|---|---|---|
| routes/agents.js | /api/ | 8 | LIVE |
| routes/civilization.js | /api/ | ~40 | LIVE |
| routes/cognitive.js | /api/ | ~25 | LIVE |
| routes/cognitive-evolution.js | /api/ (BUG: not /api/cognitive-evolution/) | ~15 | LIVE with MOUNT BUG |
| routes/communications.js | /api/ | 3 | LIVE |
| routes/empire.js | /api/empire/ | 19 | LIVE |
| routes/executive-performance.js | /api/ | 11 | LIVE |
| routes/finance.js | /api/ | 4 | LIVE |
| routes/founder.js | /api/ | ~30 | LIVE |
| routes/founder-graph.js | /api/ | 15 | LIVE |
| routes/governance.js | /api/ | 16 | LIVE |
| routes/health.js | /api/ | 14 | LIVE |
| routes/intelligence.js | /api/intelligence/ | 12 | LIVE |
| routes/intelligence-memory.js | /api/intelligence/ | ~25 | LIVE (shares namespace) |
| routes/knowledge-graph.js | /api/ | 10 | LIVE |
| routes/life.js | /api/ | ~20 | LIVE |
| routes/memory.js | /api/ | ~40 | LIVE |
| routes/operations.js | /api/ | 12 (8 unauth) | LIVE |
| routes/integrations.js | /api/ | 15 | LIVE |
| routes/strategic.js | /api/ | 13 | LIVE |
| (21st file) | /api/ | unknown | LIVE |

#### Special-Mounted Routes (2 files)
| File | Mount Point | Purpose | Status |
|---|---|---|---|
| routes/gemini-live.js | /ws/ or /api/ (special) | Gemini Live voice WebSocket | LIVE |
| routes/tts-gemini.js | /api/ (special) | Gemini TTS endpoint | LIVE |

---

### migrations/ (28 files)
**Purpose:** SQL schema migrations, applied in order to Supabase Postgres
**Owner:** Database
**Production Status:** ALL LIVE (all 27 SQL migrations applied)

| File | Contents | Status |
|---|---|---|
| 001_*.sql | apex_lessons, cron_logs, vault_embeddings VECTOR(1536), habits | LIVE |
| 002_*.sql | vault_embeddings RECREATED VECTOR(768), finance, health/habits/journal/spiritual, apex_agents | LIVE |
| 003_*.sql | apex_clients, apex_projects, apex_documents, apex_proposals, university/reading | LIVE |
| 004_*.sql | apex_sync_checkpoints, deployment_events, execution_events, request_logs | LIVE |
| 005_*.sql | 30+ governance tables | LIVE |
| 006_*.sql | apex_lessons ADD task_id/trace_id; apex_contacts | LIVE |
| 007_*.sql | evidence_blocks ADD canonical_payload/payload_version | LIVE |
| 008_*.sql | governance_probes | LIVE |
| 009_*.sql | All memory tables + 3 vector search SQL functions | LIVE |
| 010_*.sql | knowledge_validation_queue + learning/retrieval tables | LIVE |
| 011_*.sql | cognitive_policy_decisions + cognitive engine tables | LIVE |
| 012_*.sql | outcome attribution, twin accuracy, benchmark_results | LIVE |
| 013_*.sql | improvement_candidates extended; cognitive_evolution_reports | LIVE |
| 014_*.sql | PLACEHOLDER (SELECT 1 only) | DEAD (no-op) |
| 015_*.sql | civilization_health_snapshots, executive_decisions, founder_memory, opportunities | LIVE |
| 016_*.sql | civilization_events, executive_deliberations, executive_votes, strategy_plans | LIVE |
| 017_*.sql | executive_performance, decision_outcomes, resource_ledger, value_creation_events | LIVE |
| 018_*.sql | founder_domains, founder_goals, founder_alignment_log, founder_anti_goal_alerts, founder_state_snapshots | LIVE |
| 019_*.sql | fkg_nodes, fkg_edges (founder knowledge graph) | LIVE |
| 020_*.sql | sie_analyses, sie_recommendations, sie_decisions | LIVE |
| 021_*.sql | egraph_nodes, egraph_edges, empire_health_scores | LIVE |
| 022_*.sql | exec_performance_stats, exec_status_reports | LIVE |
| 023_*.sql | episodic_memory analytics fix (idx_em_source; gateway_duplicate repair) | LIVE |
| 024_*.sql | events, outbox, consumer_offsets (Phase 0a event spine) | LIVE |
| 025_*.sql | working_memory UNIQUE(session_id, memory_type) | LIVE |
| 026_*.sql | write_outbox_with_state() stored procedure | LIVE |
| 027_*.sql | apex_agent_runs/stages ADD note TEXT | LIVE |
| seed-founder-profile.js | Seed data for founder profile | LIVE |

---

### services/ (~10 files)
**Purpose:** External service integration wrappers
**Owner:** Integration Layer
**Production Status:** PARTIALLY LIVE

| Subdirectory | Purpose | Status |
|---|---|---|
| services/notion/ | Notion API sync (checkpoints, contacts, projects) | UNKNOWN (requires NOTION_API_KEY) |
| services/slack/ | Slack bot notification delivery | UNKNOWN (requires SLACK_BOT_TOKEN) |
| services/pipelines/ | Daily briefing, weekly review, lead pipeline | UNKNOWN (cron-triggered) |

---

### runtime/ (1 file)
**Purpose:** Task routing entry point for agent dispatch
**Owner:** Agent Orchestrator
**Production Status:** LIVE

| File | Purpose | Status |
|---|---|---|
| runtime/task-router.js | Routes incoming task requests to orchestrator | LIVE |

---

## FILE COUNT SUMMARY

| Location | Estimated File Count |
|---|---|
| Root (server.js, config, etc.) | ~10 |
| agent-system/ | 15+ |
| lib/ | 100+ |
| routes/ | 23 |
| migrations/ | 28 (27 SQL + 1 JS) |
| services/ | ~10 |
| runtime/ | 1 |
| **TOTAL** | **~1,097 (git-tracked)** |

---

## DEAD / SUSPECT DIRECTORIES OR FILES

| Artifact | Reason | Confidence |
|---|---|---|
| migrations/014_*.sql | SELECT 1 only, no-op placeholder | HIGH |
| vault_embeddings VECTOR(1536) in migration 001 | Dropped and recreated in 002; never held production data | HIGH |
| services/pipelines/ (active scheduling) | Callable but unknown if cron-scheduled | MEDIUM |
| lib/mastra*.js (active usage) | 5-min deferred init; unknown if used | MEDIUM |
| lib/langchain*.js (active usage) | Lazy-loaded; only if voice-chat used | MEDIUM |

**Note:** Migration 014 is the only definitively dead migration. All 23 route files are registered and LIVE even if some underlying features are unscheduled.
