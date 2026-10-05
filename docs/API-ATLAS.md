# API ATLAS
## Document 4 of 17 — Every API Endpoint
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## CRITICAL WARNING: COGNITIVE-EVOLUTION MOUNT BUG

> **MOUNT BUG (routes/cognitive-evolution.js):** This file's comment states it is "Mounted at /api/cognitive-evolution" but `_loadAgentRoutes()` in server.js mounts ALL auto-loaded route files at `/api/`. Routes defined as `/attribution/impact`, `/twin/*`, `/policies/*` etc. in this file resolve to `/api/attribution/impact`, `/api/twin/*`, `/api/policies/*` — NOT `/api/cognitive-evolution/attribution/impact`. These routes may silently collide with other route files or be unreachable by any client expecting the documented path.

---

## TOTAL ROUTE COUNT

| Source | Count |
|---|---|
| Inline server.js routes | ~35 |
| routes/agents.js | 8 |
| routes/civilization.js | ~40 |
| routes/cognitive.js | ~25 |
| routes/cognitive-evolution.js | ~15 (MOUNT BUG) |
| routes/communications.js | 3 |
| routes/empire.js | 19 |
| routes/executive-performance.js | 11 |
| routes/finance.js | 4 |
| routes/founder.js | ~30 |
| routes/founder-graph.js | 15 |
| routes/governance.js | 16 |
| routes/health.js | 14 |
| routes/intelligence.js | 12 |
| routes/intelligence-memory.js | ~25 |
| routes/knowledge-graph.js | 10 |
| routes/life.js | ~20 |
| routes/memory.js | ~40 |
| routes/operations.js | 12 (8 unauthenticated) |
| routes/integrations.js | 15 |
| routes/strategic.js | 13 |
| routes/gemini-live.js | special (WebSocket) |
| routes/tts-gemini.js | special |
| **TOTAL (estimated)** | **~370+** |

---

## AUTH LEGEND
- **AUTH-3** = All 3 layers (requireAuth + requireAppAccess + requireCronAccess)
- **AUTH-2** = requireAuth + requireAppAccess
- **AUTH-1** = requireAuth only (JWT/API key)
- **NONE** = No authentication required

---

## INLINE SERVER.JS ROUTES (~35 routes)

| Method | Path | Auth | Purpose | Notes |
|---|---|---|---|---|
| POST | /api/login | NONE | Dashboard login; sets JWT cookie | Password compare uses !== (vulnerability — not timingSafeEqual) |
| POST | /api/logout | NONE | Clear JWT cookie | |
| GET | /api/dashboard | AUTH-1 | Dashboard HTML | BYPASS_DASHBOARD_AUTH=true skips auth |
| POST | /api/chat | AUTH-1 | Primary AI chat endpoint | Injects formatRecentMemory() into system prompt |
| POST | /api/task | AUTH-1 | Submit agent task | Dispatches to orchestrator |
| GET | /api/tasks | AUTH-1 | List agent tasks | |
| GET | /api/tasks/:id | AUTH-1 | Get task status | |
| DELETE | /api/tasks/:id | AUTH-1 | Cancel/delete task | |
| POST | /api/memory | AUTH-1 | Store memory | Routes through gateway |
| GET | /api/memory/search | AUTH-1 | Search memory | |
| GET | /api/memory/recent | AUTH-1 | Recent memory | formatRecentMemory() — injected into AI prompts |
| POST | /api/documents | AUTH-1 | Upload document | Supabase Storage |
| GET | /api/documents | AUTH-1 | List documents | |
| GET | /api/documents/:id | AUTH-1 | Get document | |
| DELETE | /api/documents/:id | AUTH-1 | Delete document | |
| GET | /api/schedules | AUTH-1 | List agent schedules | |
| POST | /api/schedules | AUTH-1 | Create schedule | |
| PUT | /api/schedules/:id | AUTH-1 | Update schedule | |
| DELETE | /api/schedules/:id | AUTH-1 | Delete schedule | |
| POST | /cron/run-schedules | AUTH-3 (CRON) | Render external cron trigger | x-cron-secret required |
| GET | /api/autonomy | AUTH-1 | Get autonomy level | |
| POST | /api/autonomy | AUTH-1 | Set autonomy level | LEVEL_0 blocks all pipeline |
| POST | /api/notify | AUTH-1 | Send notification | |
| GET | /api/sessions | AUTH-1 | List sessions | |
| POST | /api/sessions | AUTH-1 | Create session | |
| (inline with duplicate auth) | various | AUTH-2 | Routes using inline requireAppAccess (lines 827-835) | Duplicate implementation of lib/app-auth.js |
| (additional ~10 inline) | /api/* | AUTH-1 | Various inline handlers | |

---

## routes/agents.js (8 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/agents | AUTH-1 | List agent profiles | apex_agents |
| GET | /api/agents/:id | AUTH-1 | Get agent profile | apex_agents |
| POST | /api/agents | AUTH-1 | Create agent profile | apex_agents |
| PUT | /api/agents/:id | AUTH-1 | Update agent profile | apex_agents |
| GET | /api/agents/:id/runs | AUTH-1 | Agent run history | apex_agent_runs |
| GET | /api/agents/runs/:runId | AUTH-1 | Get run detail | apex_agent_runs, apex_agent_stages |
| POST | /api/agents/run | AUTH-1 | Trigger agent run | apex_agent_runs, apex_agent_stages |
| GET | /api/agents/reputation | AUTH-1 | Agent reputation scores | agent_reputation_events |

---

## routes/civilization.js (~40 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/civilization/health | AUTH-1 | Current civilization health | civilization_health_snapshots |
| POST | /api/civilization/snapshot | AUTH-1 | Capture health snapshot | civilization_health_snapshots |
| GET | /api/civilization/events | AUTH-1 | List civilization events | civilization_events |
| POST | /api/civilization/events | AUTH-1 | Record event | civilization_events |
| GET | /api/civilization/executive/decisions | AUTH-1 | List executive decisions | executive_decisions |
| POST | /api/civilization/executive/decisions | AUTH-1 | Create executive decision | executive_decisions |
| GET | /api/civilization/executive/deliberations | AUTH-1 | List deliberations | executive_deliberations |
| POST | /api/civilization/executive/deliberations | AUTH-1 | Create deliberation | executive_deliberations |
| POST | /api/civilization/executive/votes | AUTH-1 | Record vote | executive_votes |
| GET | /api/civilization/strategy | AUTH-1 | Get strategy plans | strategy_plans |
| POST | /api/civilization/strategy | AUTH-1 | Create strategy plan | strategy_plans |
| GET | /api/civilization/opportunities | AUTH-1 | List opportunities | opportunities |
| POST | /api/civilization/opportunities | AUTH-1 | Create opportunity | opportunities |
| GET | /api/civilization/value | AUTH-1 | Value creation events | value_creation_events |
| POST | /api/civilization/value | AUTH-1 | Record value creation | value_creation_events |
| GET | /api/civilization/resources | AUTH-1 | Resource ledger | resource_ledger |
| POST | /api/civilization/resources | AUTH-1 | Update resource ledger | resource_ledger |
| GET | /api/civilization/runtime/status | AUTH-1 | Runtime status | civilization_health_snapshots |
| POST | /api/civilization/runtime/start | AUTH-1 | Start civilization runtime | — |
| POST | /api/civilization/runtime/stop | AUTH-1 | Stop civilization runtime | — |
| (additional ~20 routes) | /api/civilization/* | AUTH-1 | Various civilization management | Multiple tables |

---

## routes/cognitive.js (~25 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/cognitive/policies | AUTH-1 | List cognitive policies | cognitive_policy_decisions |
| POST | /api/cognitive/policies | AUTH-1 | Create policy decision | cognitive_policy_decisions |
| GET | /api/cognitive/behavioral | AUTH-1 | List behavioral modifications | behavioral_modifications |
| POST | /api/cognitive/behavioral | AUTH-1 | Apply behavioral modification | behavioral_modifications |
| GET | /api/cognitive/autonomy | AUTH-1 | Autonomy decisions | autonomy_decisions |
| POST | /api/cognitive/autonomy | AUTH-1 | Set autonomy decision | autonomy_decisions |
| GET | /api/cognitive/performance | AUTH-1 | Cognitive performance metrics | cognitive_performance_metrics |
| POST | /api/cognitive/performance | AUTH-1 | Record performance metric | cognitive_performance_metrics |
| GET | /api/cognitive/evolution/proposals | AUTH-1 | Evolution proposals | cognitive_evolution_proposals |
| GET | /api/cognitive/intelligence-reports | AUTH-1 | Intelligence reports | intelligence_reports |
| GET | /api/cognitive/twin | AUTH-1 | Digital twin simulations | digital_twin_simulations |
| POST | /api/cognitive/twin/simulate | AUTH-1 | Run twin simulation | digital_twin_simulations |
| (additional ~13 routes) | /api/cognitive/* | AUTH-1 | Various cognitive management | Multiple tables |

---

## routes/cognitive-evolution.js (~15 routes) — MOUNT BUG

> **WARNING:** All routes in this file resolve at /api/ NOT /api/cognitive-evolution/. The actual resolved paths are shown below.

| Method | Defined Path | ACTUAL Resolved Path | Auth | Purpose | Tables |
|---|---|---|---|---|---|
| GET | /attribution/impact | /api/attribution/impact | AUTH-1 | Attribution analysis | outcome_attribution_records |
| GET | /twin/accuracy | /api/twin/accuracy | AUTH-1 | Twin accuracy records | twin_accuracy_records |
| GET | /policies/settings | /api/policies/settings | AUTH-1 | Cognitive policy settings | cognitive_policy_settings |
| PUT | /policies/settings | /api/policies/settings | AUTH-1 | Update policy settings | cognitive_policy_settings |
| GET | /benchmarks | /api/benchmarks | AUTH-1 | Benchmark results | benchmark_results |
| POST | /benchmarks | /api/benchmarks | AUTH-1 | Record benchmark | benchmark_results |
| GET | /evolution/reports | /api/evolution/reports | AUTH-1 | Evolution reports | cognitive_evolution_reports |
| GET | /improvement | /api/improvement | AUTH-1 | Improvement candidates | improvement_candidates |
| (additional ~7) | /api/* | /api/* | AUTH-1 | Various | Multiple tables |

---

## routes/communications.js (3 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| POST | /api/communications/slack | AUTH-1 | Send Slack message | — (external) |
| GET | /api/communications/status | AUTH-1 | Integration status | — |
| POST | /api/communications/notify | AUTH-1 | Send notification | — |

---

## routes/empire.js (19 routes — all /api/empire/*)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/empire/health | AUTH-1 | Empire health scores | empire_health_scores |
| POST | /api/empire/health | AUTH-1 | Record health score | empire_health_scores |
| GET | /api/empire/graph/nodes | AUTH-1 | Empire graph nodes | egraph_nodes |
| POST | /api/empire/graph/nodes | AUTH-1 | Create graph node | egraph_nodes |
| GET | /api/empire/graph/edges | AUTH-1 | Empire graph edges | egraph_edges |
| POST | /api/empire/graph/edges | AUTH-1 | Create graph edge | egraph_edges |
| GET | /api/empire/sie/analyses | AUTH-1 | SIE analyses | sie_analyses |
| POST | /api/empire/sie/analyses | AUTH-1 | Record SIE analysis | sie_analyses |
| GET | /api/empire/sie/recommendations | AUTH-1 | SIE recommendations | sie_recommendations |
| POST | /api/empire/sie/recommendations | AUTH-1 | Record recommendation | sie_recommendations |
| POST | /api/empire/sie/decisions | AUTH-1 | Record SIE decision | sie_decisions |
| GET | /api/empire/sie/decisions | AUTH-1 | List SIE decisions | sie_decisions |
| GET | /api/empire/performance | AUTH-1 | Exec performance stats | exec_performance_stats |
| POST | /api/empire/performance | AUTH-1 | Record performance stat | exec_performance_stats |
| GET | /api/empire/status-reports | AUTH-1 | Status reports | exec_status_reports |
| POST | /api/empire/status-reports | AUTH-1 | Create status report | exec_status_reports |
| GET | /api/empire/summary | AUTH-1 | Empire summary | Multiple |
| PUT | /api/empire/graph/nodes/:id | AUTH-1 | Update graph node | egraph_nodes |
| DELETE | /api/empire/graph/nodes/:id | AUTH-1 | Delete graph node | egraph_nodes |

---

## routes/executive-performance.js (11 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/executive/performance | AUTH-1 | Executive performance records | executive_performance |
| POST | /api/executive/performance | AUTH-1 | Record performance | executive_performance |
| GET | /api/executive/outcomes | AUTH-1 | Decision outcomes | decision_outcomes |
| POST | /api/executive/outcomes | AUTH-1 | Record outcome | decision_outcomes |
| GET | /api/executive/ledger | AUTH-1 | Resource ledger | resource_ledger |
| GET | /api/executive/value | AUTH-1 | Value creation events | value_creation_events |
| POST | /api/executive/value | AUTH-1 | Record value creation | value_creation_events |
| GET | /api/executive/summary | AUTH-1 | Executive summary | Multiple |
| GET | /api/executive/stats | AUTH-1 | Exec performance stats | exec_performance_stats |
| GET | /api/executive/reports | AUTH-1 | Status reports | exec_status_reports |
| POST | /api/executive/reports | AUTH-1 | Create status report | exec_status_reports |

---

## routes/finance.js (4 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/finance/records | AUTH-1 | Financial records | finance tables |
| POST | /api/finance/records | AUTH-1 | Create financial record | finance tables |
| GET | /api/finance/summary | AUTH-1 | Financial summary | finance tables |
| DELETE | /api/finance/records/:id | AUTH-1 | Delete record | finance tables |

---

## routes/founder.js (~30 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/founder/memory | AUTH-1 | Founder memory entries | founder_memory |
| POST | /api/founder/memory | AUTH-1 | Store founder memory | founder_memory |
| GET | /api/founder/goals | AUTH-1 | Founder goals | founder_goals |
| POST | /api/founder/goals | AUTH-1 | Create goal | founder_goals |
| PUT | /api/founder/goals/:id | AUTH-1 | Update goal | founder_goals |
| GET | /api/founder/domains | AUTH-1 | Founder domains | founder_domains |
| POST | /api/founder/domains | AUTH-1 | Create domain | founder_domains |
| GET | /api/founder/alignment | AUTH-1 | Alignment log | founder_alignment_log |
| POST | /api/founder/alignment | AUTH-1 | Log alignment check | founder_alignment_log |
| GET | /api/founder/anti-goals/alerts | AUTH-1 | Anti-goal alerts | founder_anti_goal_alerts |
| POST | /api/founder/anti-goals/alerts | AUTH-1 | Create anti-goal alert | founder_anti_goal_alerts |
| GET | /api/founder/state | AUTH-1 | Founder state snapshots | founder_state_snapshots |
| POST | /api/founder/state | AUTH-1 | Capture state snapshot | founder_state_snapshots |
| GET | /api/founder/opportunities | AUTH-1 | Opportunities | opportunities |
| (additional ~15 routes) | /api/founder/* | AUTH-1 | Various founder management | Multiple tables |

---

## routes/founder-graph.js (15 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/founder/graph/nodes | AUTH-1 | FKG nodes | fkg_nodes |
| POST | /api/founder/graph/nodes | AUTH-1 | Create FKG node | fkg_nodes |
| PUT | /api/founder/graph/nodes/:id | AUTH-1 | Update FKG node | fkg_nodes |
| DELETE | /api/founder/graph/nodes/:id | AUTH-1 | Delete FKG node | fkg_nodes |
| GET | /api/founder/graph/edges | AUTH-1 | FKG edges | fkg_edges |
| POST | /api/founder/graph/edges | AUTH-1 | Create FKG edge | fkg_edges |
| DELETE | /api/founder/graph/edges/:id | AUTH-1 | Delete FKG edge | fkg_edges |
| GET | /api/founder/graph/search | AUTH-1 | Search knowledge graph | fkg_nodes, fkg_edges |
| GET | /api/founder/graph/neighbors/:id | AUTH-1 | Get node neighbors | fkg_edges |
| GET | /api/founder/graph/paths | AUTH-1 | Find paths between nodes | fkg_nodes, fkg_edges |
| GET | /api/founder/graph/summary | AUTH-1 | Graph summary stats | fkg_nodes, fkg_edges |
| POST | /api/founder/graph/import | AUTH-1 | Import graph data | fkg_nodes, fkg_edges |
| GET | /api/founder/graph/export | AUTH-1 | Export graph | fkg_nodes, fkg_edges |
| GET | /api/founder/graph/clusters | AUTH-1 | Node clusters | fkg_nodes, fkg_edges |
| PUT | /api/founder/graph/edges/:id | AUTH-1 | Update FKG edge | fkg_edges |

---

## routes/governance.js (16 routes)

> **RISK:** This file creates a new Supabase client on EVERY handler invocation (lines 12-14). Connection leak risk.

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| POST | /api/governance/probe | AUTH-1 | Run governance probe | governance_probes |
| GET | /api/governance/probe/latest | AUTH-1 | Latest probe result | governance_probes |
| GET | /api/governance/evidence | AUTH-1 | Evidence blocks | evidence_blocks |
| POST | /api/governance/evidence | AUTH-1 | Append evidence | evidence_blocks |
| GET | /api/governance/certifications | AUTH-1 | Certifications | certifications |
| POST | /api/governance/certifications | AUTH-1 | Create certification | certifications |
| GET | /api/governance/slo | AUTH-1 | SLO definitions | slo_definitions |
| GET | /api/governance/slo/measurements | AUTH-1 | SLO measurements | slo_measurements |
| GET | /api/governance/slo/violations | AUTH-1 | SLO violations | slo_violations |
| GET | /api/governance/incidents | AUTH-1 | Incidents | incidents |
| POST | /api/governance/incidents | AUTH-1 | Create incident | incidents |
| PUT | /api/governance/incidents/:id/resolve | AUTH-1 | Resolve incident | incidents, incident_resolutions |
| GET | /api/governance/policies | AUTH-1 | Policies | policies |
| GET | /api/governance/violations | AUTH-1 | Policy violations | policy_violations |
| GET | /api/governance/snapshots | AUTH-1 | Dashboard snapshots | dashboard_snapshots |
| GET | /api/governance/summary | AUTH-1 | Governance summary | Multiple |

---

## routes/health.js (14 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/health/habits | AUTH-1 | Habits | habits |
| POST | /api/health/habits | AUTH-1 | Create habit | habits |
| PUT | /api/health/habits/:id | AUTH-1 | Update habit | habits |
| GET | /api/health/journal | AUTH-1 | Health journal | (health journal table) |
| POST | /api/health/journal | AUTH-1 | Create journal entry | (health journal table) |
| GET | /api/health/spiritual | AUTH-1 | Spiritual log | (spiritual table) |
| POST | /api/health/spiritual | AUTH-1 | Create spiritual entry | (spiritual table) |
| GET | /api/health/metrics | AUTH-1 | Health metrics | (health tables) |
| POST | /api/health/metrics | AUTH-1 | Record health metric | (health tables) |
| GET | /api/health/summary | AUTH-1 | Health summary | Multiple |
| GET | /api/health/reading | AUTH-1 | Reading log | (reading table) |
| POST | /api/health/reading | AUTH-1 | Log reading | (reading table) |
| GET | /api/health/university | AUTH-1 | University progress | (university tables) |
| POST | /api/health/university | AUTH-1 | Log university activity | (university tables) |

---

## routes/intelligence.js (12 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/intelligence/news | AUTH-1 | Cached news items | (intelligence tables) |
| POST | /api/intelligence/news/refresh | AUTH-1 | Trigger news ingestion | (intelligence tables) |
| GET | /api/intelligence/self-check | AUTH-1 | 9-subsystem diagnostics | Multiple |
| GET | /api/intelligence/knowledge | AUTH-1 | Knowledge items | (knowledge tables) |
| POST | /api/intelligence/knowledge | AUTH-1 | Ingest knowledge | (knowledge tables) |
| GET | /api/intelligence/validation | AUTH-1 | Validation queue | knowledge_validation_queue |
| POST | /api/intelligence/validate | AUTH-1 | Run knowledge validation | knowledge_validation_queue |
| GET | /api/intelligence/contradictions | AUTH-1 | Contradiction reports | contradiction_reports |
| GET | /api/intelligence/learning | AUTH-1 | Learning reports | learning_reports |
| GET | /api/intelligence/temperature | AUTH-1 | Memory temperature scores | memory_temperature_scores |
| GET | /api/intelligence/skills | AUTH-1 | Skill evolution snapshots | skill_evolution_snapshots |
| GET | /api/intelligence/summary | AUTH-1 | Intelligence summary | Multiple |

---

## routes/intelligence-memory.js (~25 routes)

> **RISK:** Shares /api/intelligence/* namespace with routes/intelligence.js. Load-order determines conflict resolution.

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/intelligence/retrieval/logs | AUTH-1 | Retrieval logs | retrieval_logs |
| GET | /api/intelligence/retrieval/policy | AUTH-1 | Retrieval policy decisions | retrieval_policy_decisions |
| POST | /api/intelligence/retrieval/policy | AUTH-1 | Set retrieval policy | retrieval_policy_decisions |
| GET | /api/intelligence/retrieval/evaluations | AUTH-1 | Retrieval evaluations | retrieval_evaluations |
| GET | /api/intelligence/decay | AUTH-1 | Knowledge decay assessments | knowledge_decay_assessments |
| POST | /api/intelligence/decay | AUTH-1 | Record decay assessment | knowledge_decay_assessments |
| GET | /api/intelligence/meta-reasoning | AUTH-1 | Meta reasoning observations | meta_reasoning_observations |
| GET | /api/intelligence/consolidation | AUTH-1 | Memory consolidation queue | memory_consolidation_queue |
| POST | /api/intelligence/consolidation/run | AUTH-1 | Run consolidation | memory_consolidation_queue |
| GET | /api/intelligence/reflexion | AUTH-1 | Reflexion records | reflexion_records |
| GET | /api/intelligence/improvement | AUTH-1 | Improvement candidates | improvement_candidates |
| (additional ~14 routes) | /api/intelligence/* | AUTH-1 | Various intelligence-memory | Multiple tables |

---

## routes/knowledge-graph.js (10 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/knowledge-graph/nodes | AUTH-1 | KG nodes | knowledge_graph_nodes |
| POST | /api/knowledge-graph/nodes | AUTH-1 | Create KG node | knowledge_graph_nodes |
| PUT | /api/knowledge-graph/nodes/:id | AUTH-1 | Update KG node | knowledge_graph_nodes |
| DELETE | /api/knowledge-graph/nodes/:id | AUTH-1 | Delete KG node | knowledge_graph_nodes |
| GET | /api/knowledge-graph/edges | AUTH-1 | KG edges | knowledge_graph_edges |
| POST | /api/knowledge-graph/edges | AUTH-1 | Create KG edge | knowledge_graph_edges |
| DELETE | /api/knowledge-graph/edges/:id | AUTH-1 | Delete KG edge | knowledge_graph_edges |
| GET | /api/knowledge-graph/search | AUTH-1 | Semantic search | knowledge_graph_nodes |
| GET | /api/knowledge-graph/neighbors/:id | AUTH-1 | Node neighbors | knowledge_graph_edges |
| GET | /api/knowledge-graph/summary | AUTH-1 | Graph summary | knowledge_graph_nodes, knowledge_graph_edges |

---

## routes/life.js (~20 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/life/journal | AUTH-1 | Life journal | (journal tables) |
| POST | /api/life/journal | AUTH-1 | Create journal entry | (journal tables) |
| GET | /api/life/habits | AUTH-1 | Habits tracking | habits |
| GET | /api/life/contacts | AUTH-1 | Contacts | apex_contacts |
| POST | /api/life/contacts | AUTH-1 | Create contact | apex_contacts |
| PUT | /api/life/contacts/:id | AUTH-1 | Update contact | apex_contacts |
| GET | /api/life/reading | AUTH-1 | Reading list | (reading tables) |
| GET | /api/life/university | AUTH-1 | University courses | (university tables) |
| GET | /api/life/summary | AUTH-1 | Life summary | Multiple |
| (additional ~11 routes) | /api/life/* | AUTH-1 | Various life management | Multiple tables |

---

## routes/memory.js (~40 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/memory/working | AUTH-1 | Working memory | working_memory |
| POST | /api/memory/working | AUTH-1 | Store working memory | working_memory |
| DELETE | /api/memory/working/:id | AUTH-1 | Expire working memory | working_memory |
| GET | /api/memory/episodic | AUTH-1 | Episodic memory | episodic_memory |
| POST | /api/memory/episodic | AUTH-1 | Store episodic memory | episodic_memory |
| GET | /api/memory/semantic | AUTH-1 | Semantic memory | semantic_memory |
| POST | /api/memory/semantic | AUTH-1 | Store semantic memory | semantic_memory |
| GET | /api/memory/procedural | AUTH-1 | Procedural memory | procedural_memory |
| POST | /api/memory/procedural | AUTH-1 | Store procedural | procedural_memory |
| GET | /api/memory/strategic | AUTH-1 | Strategic memory | strategic_memory |
| POST | /api/memory/strategic | AUTH-1 | Store strategic | strategic_memory |
| GET | /api/memory/skill | AUTH-1 | Skill memory | skill_memory |
| POST | /api/memory/skill | AUTH-1 | Store skill | skill_memory |
| GET | /api/memory/decision | AUTH-1 | Decision memory | decision_memory |
| POST | /api/memory/decision | AUTH-1 | Store decision | decision_memory |
| GET | /api/memory/lessons | AUTH-1 | Apex lessons | apex_lessons |
| POST | /api/memory/lessons | AUTH-1 | Store lesson | apex_lessons |
| GET | /api/memory/reflexion | AUTH-1 | Reflexion records | reflexion_records |
| GET | /api/memory/improvement | AUTH-1 | Improvement candidates | improvement_candidates |
| GET | /api/memory/graph | AUTH-1 | KG nodes+edges | knowledge_graph_nodes, knowledge_graph_edges |
| GET | /api/memory/consolidation | AUTH-1 | Consolidation queue | memory_consolidation_queue |
| GET | /api/memory/summary | AUTH-1 | All memory summary | Multiple |
| GET | /api/memory/search | AUTH-1 | Cross-layer search | Multiple memory tables |
| (additional ~17 routes) | /api/memory/* | AUTH-1 | Various memory management | Multiple tables |

---

## routes/operations.js (12 routes — 8 UNAUTHENTICATED)

> **IMPORTANT:** 8 of 12 routes in this file require NO authentication. These are intentionally public operational endpoints.

| Method | Path | Auth | Purpose | Notes |
|---|---|---|---|---|
| GET | /api/healthz | **NONE** | Kubernetes-style health check | UNAUTHENTICATED |
| GET | /api/version | **NONE** | App version info | UNAUTHENTICATED |
| GET | /api/status | **NONE** | System status | UNAUTHENTICATED |
| GET | /api/ping | **NONE** | Ping/pong | UNAUTHENTICATED |
| GET | /api/ready | **NONE** | Readiness probe | UNAUTHENTICATED |
| GET | /api/metrics | **NONE** | Request counter metrics | UNAUTHENTICATED — lib/counter.js |
| GET | /api/build-info | **NONE** | Build/deploy info | UNAUTHENTICATED |
| GET | /api/uptime | **NONE** | Server uptime | UNAUTHENTICATED |
| GET | /api/operations/logs | AUTH-1 | Cron logs | cron_logs |
| GET | /api/operations/deployments | AUTH-1 | Deployment events | deployment_events |
| GET | /api/operations/runtime-readiness | AUTH-1 | Runtime readiness scorecard | Multiple |
| GET | /api/operations/evidence-completeness | AUTH-1 | Evidence completeness score | evidence_blocks |

---

## routes/integrations.js (15 routes)

> **RISK:** Handler at line 122-123 creates new Supabase client per request (per-request violation).

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| POST | /api/integrations/notion/sync | AUTH-1 | Trigger Notion sync | apex_sync_checkpoints, apex_contacts, apex_projects |
| GET | /api/integrations/notion/status | AUTH-1 | Notion sync status | apex_sync_checkpoints |
| GET | /api/integrations/clients | AUTH-1 | List clients | apex_clients |
| POST | /api/integrations/clients | AUTH-1 | Create client | apex_clients |
| PUT | /api/integrations/clients/:id | AUTH-1 | Update client | apex_clients |
| GET | /api/integrations/projects | AUTH-1 | List projects | apex_projects |
| POST | /api/integrations/projects | AUTH-1 | Create project | apex_projects |
| GET | /api/integrations/proposals | AUTH-1 | List proposals | apex_proposals |
| POST | /api/integrations/proposals | AUTH-1 | Create proposal | apex_proposals |
| GET | /api/integrations/gmail/messages | AUTH-1 | Gmail messages | — (external) |
| POST | /api/integrations/gmail/send | AUTH-1 | Send Gmail | — (external) |
| GET | /api/integrations/github/repos | AUTH-1 | GitHub repos | — (external) |
| GET | /api/integrations/slack/status | AUTH-1 | Slack connection status | — (external) |
| POST | /api/integrations/slack/send | AUTH-1 | Send Slack message | — (external) |
| GET | /api/integrations/summary | AUTH-1 | Integration summary | Multiple |

---

## routes/strategic.js (13 routes)

| Method | Path | Auth | Purpose | Tables |
|---|---|---|---|---|
| GET | /api/strategic/plans | AUTH-1 | Strategy plans | strategy_plans |
| POST | /api/strategic/plans | AUTH-1 | Create plan | strategy_plans |
| PUT | /api/strategic/plans/:id | AUTH-1 | Update plan | strategy_plans |
| GET | /api/strategic/decisions | AUTH-1 | Strategic decisions | executive_decisions |
| POST | /api/strategic/decisions | AUTH-1 | Create decision | executive_decisions |
| GET | /api/strategic/opportunities | AUTH-1 | Opportunities | opportunities |
| POST | /api/strategic/opportunities | AUTH-1 | Create opportunity | opportunities |
| GET | /api/strategic/risk | AUTH-1 | Risk scores | risk_scores |
| POST | /api/strategic/risk | AUTH-1 | Record risk score | risk_scores |
| GET | /api/strategic/causal | AUTH-1 | Causal analyses | causal_analyses |
| GET | /api/strategic/impact | AUTH-1 | Impact analyses | impact_analyses |
| GET | /api/strategic/changes | AUTH-1 | Change classifications | change_classifications |
| GET | /api/strategic/summary | AUTH-1 | Strategic summary | Multiple |

---

## SPECIAL ROUTES

### routes/gemini-live.js
| Type | Path | Auth | Purpose |
|---|---|---|---|
| WebSocket | /ws/gemini-live (inferred) | AUTH-1 | Real-time voice via Gemini Live |

### routes/tts-gemini.js
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/tts/gemini (inferred) | AUTH-1 | Gemini TTS synthesis |

---

## RISK SUMMARY

| Risk | Route(s) | Severity |
|---|---|---|
| Mount bug — wrong paths | routes/cognitive-evolution.js (all ~15 routes) | HIGH |
| Per-request Supabase client | routes/governance.js, routes/integrations.js | MEDIUM |
| Namespace collision | routes/intelligence.js + routes/intelligence-memory.js | MEDIUM |
| Unauthenticated endpoints | /api/healthz, /api/version, /api/status, /api/ping, /api/ready, /api/metrics, /api/build-info, /api/uptime | LOW (intentional) |
| Login timing attack | /api/login (password compare uses !==) | HIGH |
| Dashboard auth bypass | /api/dashboard (BYPASS_DASHBOARD_AUTH env) | MEDIUM |
