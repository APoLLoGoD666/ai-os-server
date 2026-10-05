# APEX-SYSTEM-INVENTORY.md
# APEX One Platform — System Inventory

**Phase:** Phase 0 Authority Audit (Re-run)
**Date:** 2026-08-19
**Previous audit:** 2026-08-04
**Authority:** Repository reality — direct file reads, import tracing, git status

**Classification key:**
- `ACTIVE` — confirmed in live execution path
- `CANONICAL` — the authoritative version of a component
- `LEGACY` — superseded; still present, may still be imported
- `DEPRECATED` — confirmed unused or explicitly replaced
- `UNKNOWN` — not traced to a confirmed import path
- `TOOLING` — dev/ops utility, not part of runtime
- `UNTRACKED` — exists locally but never committed; NOT in production

---

## SECTION 1: RUNTIME / ENTRY POINTS

| Component | File | Classification | Evidence |
|-----------|------|---------------|---------|
| Main server | `server.js` | ACTIVE — CANONICAL | Sole entry point; render.yaml startCommand; committed |
| Sentry init | `instrument.js` | ACTIVE | First require in server.js; committed |
| Startup wiring | `lib/startup.js` | ACTIVE — MODIFIED | wireEvents + onListen; committed, modified (`M`) |
| Secondary startup | `lib/startup/index.js` | UNKNOWN | Distinct from startup.js; imported by pg_database.js importers |
| Process singletons | `lib/server-state.js` | ACTIVE | Imported by server.js |
| PM2 config | `ecosystem.config.js` | TOOLING | Local dev only |
| Electron wrapper | `public/apex-electron.js` | UNKNOWN | Listed in package.json; not in primary runtime |
| Sidecar | `sidecar/` (Python) | ACTIVE — SECONDARY | render.yaml apex-ai-sidecar service; separate process |

---

## SECTION 2: CIVILIZATION / DELIBERATION SYSTEMS

**CRITICAL FINDING: Wave 3 files are UNTRACKED. They do NOT exist in production.**

| Component | File | Classification | Git Status |
|-----------|------|---------------|-----------|
| Deliberation registry | `lib/civilization/deliberation-registry.js` | ACTIVE — CANONICAL — UNTRACKED | `??` |
| RT-12 bootstrap | `lib/civilization/rt12-bootstrap.js` | ACTIVE — CANONICAL — UNTRACKED | `??` |
| RT-13 bootstrap | `lib/civilization/rt13-bootstrap.js` | ACTIVE — CANONICAL — UNTRACKED | `??` |
| Constitutional store | `lib/runtime/constitutional-store.js` | ACTIVE — CANONICAL — UNTRACKED | `??` |
| Civilization understanding | `lib/civilization/civilization-understanding-registry.js` | ACTIVE — UNTRACKED | `??` |
| Admission engine | `lib/civilization/admission-engine.js` | ACTIVE | Tracked |
| Domain scorer | `lib/civilization/domain-scorer.js` | ACTIVE | Tracked |
| OLD consensus | `civilisation/consensus.js` | ACTIVE — LEGACY | Imported by lib/intelligence/civilization-runtime.js; committed |
| OLD clock | `civilisation/clock.js` | LEGACY | Pre-Wave 3; committed |
| OLD contract-validator | `civilisation/contract-validator.js` | LEGACY | Pre-Wave 3; committed |
| OLD domain-loader | `civilisation/domain-loader.js` | ACTIVE — LEGACY — MODIFIED | Imported by 8 modules; modified in working tree |
| OLD genome-validator | `civilisation/genome-validator.js` | LEGACY | Committed |
| OLD shadow-registry | `civilisation/shadow-registry.js` | LEGACY | Committed |
| Constitutional records migration | `migrations/080_constitutional_records.sql` | UNTRACKED | `??` — NOT applied to production |
| Migration 081 | `migrations/081_obs_record_id_propagation.sql` | UNTRACKED | `??` |
| Migration 082 | `migrations/082_domain_id_propagation.sql` | UNTRACKED | `??` |

**Conflict inherited from Aug-4 audit:** `civilisation/consensus.js` (LEGACY, `consensus_sessions` table) vs `lib/civilization/deliberation-registry.js` (CANONICAL, `constitutional_records` table) — both handle deliberation with incompatible schemas. Additionally, the canonical path has never been deployed.

---

## SECTION 3: MEMORY SYSTEMS

| Component | File | Classification | Evidence |
|-----------|------|---------------|---------|
| Memory gateway | `lib/memory/gateway.js` | ACTIVE — CANONICAL | All memory access should flow here; imported by server.js, kernel, orchestrator |
| Working memory | `lib/memory/working-memory.js` | ACTIVE | Layer 1 in gateway |
| Episodic memory (canonical) | `lib/memory/episodic-memory-pg.js` | ACTIVE — CANONICAL | Layer 2 in gateway |
| Semantic memory | `lib/memory/semantic-memory.js` | ACTIVE | Layer 3 in gateway |
| Procedural memory | `lib/memory/procedural-memory.js` | ACTIVE | Layer 4 in gateway |
| Strategic memory | `lib/memory/strategic-memory.js` | ACTIVE | Layer 5 in gateway |
| Skill memory | `lib/memory/skill-memory.js` | ACTIVE | Layer 6 in gateway |
| Decision memory | `lib/memory/decision-memory.js` | ACTIVE | Layer 7 in gateway |
| Knowledge graph | `lib/memory/knowledge-graph.js` | ACTIVE | Layer 8 in gateway |
| Consolidation engine | `lib/memory/consolidation-engine.js` | ACTIVE | Layer 10 in gateway |
| Reflexion tracker | `lib/memory/reflexion-tracker.js` | ACTIVE | Layer 11 in gateway; imported directly by orchestrator.js |
| Improvement engine | `lib/memory/improvement-engine.js` | ACTIVE | Layer 12 in gateway |
| Adaptation cycle | `lib/memory/adaptation-cycle.js` | ACTIVE | Layer 13 in gateway |
| Founder memory | `lib/memory/founder-memory.js` | ACTIVE | Layer 0 in gateway |
| Memory governor | `lib/memory/memory-governor.js` | ACTIVE | Governance overlay |
| Memory sanitizer | `lib/memory/sanitizer.js` | ACTIVE | Used by gateway and server.js |
| Cache | `lib/memory/cache.js` | ACTIVE | In-memory TTL cache in gateway |
| Access controller | `lib/memory/access-controller.js` | ACTIVE | Permission enforcement in gateway |
| Governance synthesizer | `lib/memory/governance-synthesizer.js` | UNKNOWN | NEW — not in previous audit; role unconfirmed |
| Importance engine | `lib/memory/importance-engine.js` | UNKNOWN | NEW — not in previous audit; role unconfirmed |
| Policy extractor | `lib/memory/policy-extractor.js` | UNKNOWN | NEW — not in previous audit; role unconfirmed |
| OLD episodic (legacy) | `agent-system/episodic-memory.js` | ACTIVE — LEGACY | Imported DIRECTLY by orchestrator.js (bypasses gateway) |
| LangChain memory | `agent-system/langchain-memory.js` | LEGACY | EXISTS; not confirmed as imported in critical path |
| LangChain RAG | `agent-system/langchain-rag.js` | LEGACY | EXISTS; not confirmed as imported in critical path |
| Obsidian memory | `agent-system/obsidian-memory.js` | ACTIVE — PARALLEL | Imported directly by orchestrator.js; not via gateway |
| Mastra memory | `@mastra/memory` v1.20.5 | UNKNOWN | In package.json; delayed init; tables unknown |

---

## SECTION 4: AGENT SYSTEMS

| Component | File | Classification | Evidence |
|-----------|------|---------------|---------|
| Primary orchestrator | `agent-system/orchestrator.js` | ACTIVE — CANONICAL | 115.3K; runAgentTeam imported by server.js |
| Agent library | `agent-system/agent-library.js` | ACTIVE | Imported by server.js |
| Agent pipeline hooks | `agent-system/agent-pipeline-hooks.js` | ACTIVE | Imported by orchestrator |
| Agent reputation | `agent-system/agent-reputation.js` | ACTIVE | Imported by orchestrator |
| Dynamic agent selector | `agent-system/dynamic-agent-selector.js` | ACTIVE | Imported by orchestrator |
| Execution verifier | `agent-system/execution-verifier.js` | ACTIVE | Imported by orchestrator |
| Goal tracker | `agent-system/goal-tracker.js` | ACTIVE | Imported by orchestrator |
| Adaptation engine | `agent-system/adaptation-engine.js` | ACTIVE | Imported by orchestrator |
| Reflection engine | `agent-system/reflection-engine.js` | ACTIVE | Imported by orchestrator |
| Prompt expander | `agent-system/prompt-expander.js` | ACTIVE | Imported by server.js |
| Domain agents | `agent-system/domain-agents.js` | ACTIVE | Imported by server.js |
| Master orchestrator | `agent-system/master-orchestrator.js` | ACTIVE — PARALLEL | 52.8K; `autoApproveStandardPermissions` imported by server.js; imports constitutional-gate directly |
| Cloud autopilot | `agent-system/cloud_autopilot.js` | ACTIVE | Imported by server.js |
| Email agent | `agent-system/email_agent.js` | ACTIVE | Imported by server.js; uses pg_helpers |
| Routine agent | `agent-system/routine_agent.js` | ACTIVE | Imported by server.js; uses pg_helpers |
| Reflection agent | `agent-system/reflection_agent.js` | ACTIVE | Imported by server.js |
| Finance agent | `agent-system/finance_agent.js` | ACTIVE | Imported by server.js; uses pg_helpers |
| Backup manager | `agent-system/backup-manager.js` | ACTIVE | Imported by server.js |
| Memory indexer | `agent-system/memory-indexer.js` | ACTIVE | Imported by orchestrator |
| Memory retriever | `agent-system/memory-retriever.js` | ACTIVE | Imported by orchestrator path |
| RAG bridge | `agent-system/rag-bridge.js` | UNKNOWN | NEW — not in previous audit |
| Browser agent | `agent-system/browser-agent.js` | UNKNOWN | Not confirmed in server.js import |
| Capture classifier | `agent-system/capture-classifier.js` | UNKNOWN | Not confirmed in server.js import |
| Confidence estimator | `agent-system/confidence-estimator.js` | UNKNOWN | Not confirmed |
| Firecrawl bridge | `agent-system/firecrawl-bridge.js` | UNKNOWN | Package in package.json |
| Markitdown bridge | `agent-system/markitdown-bridge.js` | UNKNOWN | Sidecar dependency |
| Impeccable validator | `agent-system/impeccable-validator.js` | UNKNOWN | Not confirmed |
| Multi-agent coordinator | `agent-system/multi-agent-coordinator.js` | UNKNOWN | Not confirmed |
| Planning quality registry | `agent-system/planning-quality-registry.js` | UNKNOWN | Not confirmed |
| Agents.js | `agent-system/agents.js` | UNKNOWN | Imported by lib/agent-task-cycle.js (not orchestrator.js) |
| Mastra agents | `agent-system/mastra_agents.js` | UNKNOWN | Delayed init; unclear if active |
| Wiki reader | `agent-system/wiki-reader.js` | UNKNOWN | Not confirmed in critical path |
| News ingest | `agent-system/news-ingest.js` | UNKNOWN | Not confirmed |
| CS249R reader | `agent-system/cs249r-reader.js` | LEGACY | Academic paper reader; prototype |
| Supabase setup | `agent-system/supabase-setup.js` | TOOLING | Imports pg_database directly |
| Self-evaluator | `agent-system/self-evaluator.js` | UNKNOWN | |
| Improvement executor | `agent-system/improvement-executor.js` | UNKNOWN | |
| Task planner | `agent-system/task-planner.js` | UNKNOWN | |

---

## SECTION 5: lib/runtime/ DIRECTORY (34 files)

All 34 files from previous audit confirmed present. No new files added. No RT-14 implementation files.

| Classification | Files |
|---------------|-------|
| ACTIVE — CANONICAL | `assembler.js`, `constitutional-store.js` (UNTRACKED), `petl-middleware.js`, `execution-transaction.js`, `execution-context.js`, `constitutional-gate.js` |
| ACTIVE | `constitutional-preflight.js`, `decision-lattice.js`, `governance-attestation.js`, `governance-manifest.js`, `governance-contract.js`, `governance-compiler.js`, `governance-traceability.js`, `governance-reproducibility.js`, `decision-provenance.js`, `improvement-lab.js`, `lattice-feedback-loop.js` |
| ACTIVE — PURE OBSERVABILITY | `execution-evaluator.js`, `outcome-registry.js`, `learning-ledger.js`, `decision-benchmark.js`, `counterfactual-evaluator.js`, `outcome-lineage.js`, `strategy-engine.js`, `adaptation-simulator.js`, `lattice-calibration-advisor.js`, `lattice-health-signal.js` |
| UNKNOWN | `recorder-policy.js`, `compensation-log.js`, `concurrency-slot-manager.js`, `policy-experiment.js`, `resource-planner.js`, `invariant-compiler.js`, `execution-replay.js` |

**T4-INV Conclusion:** No RT-14 constitutional objects (ObservedConsequenceRecord, OAR-TSR, ReflectionTriggerRecord, CausalModelDivergenceRecord) implemented in lib/runtime/. All files are observability/analytics. This conclusion is unchanged from Aug-4. **T4-INV has NOT been formally completed** — no classification file exists.

---

## SECTION 6: lib/constitution/ DIRECTORY (68 files)

Status: UNKNOWN in aggregate. NOT imported by server.js directly.
`lib/constitution.js` (root-level, 2.2K) is ACTIVE — CANONICAL (Object.freeze'd static authority).
`lib/constitution/baseline.json` is DELETED (`D` in git status).
All 68 subdirectory files remain UNKNOWN — require runtime profiling to confirm import paths.

---

## SECTION 7: lib/orchestration/ DIRECTORY (26 files)

All 26 files confirmed present. Status largely UNKNOWN.
- `governance_global_state_view.js` — ACTIVE (imported by civilization-kernel middleware)
- `governance_event_bus.js` — UNKNOWN (may conflict with `lib/event-bus.js`)
- All others — UNKNOWN

---

## SECTION 8: NEW UNCLASSIFIED ROOT DIRECTORIES

These did NOT appear in the Aug-4 audit and require investigation:

| Directory | Status | Known Evidence |
|-----------|--------|---------------|
| `runtime/` | UNKNOWN | Imported by orchestrator.js as `../runtime/task-router` |
| `services/` | UNKNOWN | No import evidence found |
| `domains/` | UNKNOWN | No import evidence found |
| `vault/` | UNKNOWN | No import evidence found |
| `src/` | UNKNOWN | Contains `src/routes/` with duplicate route files (agent-schedules, agent-tasks, auth, chat) |
| `.constitution/` | UNKNOWN | Hidden directory; possible constitutional spec storage |
| `.registry-cache/` | UNKNOWN | Cache for lib/registry/ operations |
| `backups/` | UNKNOWN | Likely agent-generated backup artifacts |
| `data/` | UNKNOWN | Possible data fixtures or exports |
| `architecture/` | UNKNOWN | Possibly architectural documentation |

`src/routes/` is particularly concerning: it contains `agent-schedules.js`, `agent-tasks.js`, `auth.js`, `chat.js` — all of which duplicate core functionality in `routes/*.js`. These files import `lib/pg_helpers.js`. This is a potential DUPLICATE ROUTE LAYER.

---

## SECTION 9: EXPANSION / MINISTRY / COUNCIL SYSTEMS

| Component | File | Classification |
|-----------|------|---------------|
| Self-Expansion Engine | `lib/expansion/index.js`, `gap-detector.js`, `gap-analyzer.js` | ACTIVE |
| Ministry system | `lib/ministry/index.js`, `session.js` | ACTIVE |
| Supreme Council | `lib/executive/executive-council.js` | ACTIVE — `lib/council/` does NOT exist |

---

## SECTION 10: DATABASE LAYER

| Component | File | Classification | Evidence |
|-----------|------|---------------|---------|
| Supabase client | `lib/clients.js` | ACTIVE — CANONICAL | Primary database authority |
| pg helpers | `lib/pg_helpers.js` | ACTIVE — MISLEADING NAME | Uses Supabase JS client; 23.8K; imported by 24+ modules |
| pg_helpers renamed? | `lib/supabase-helpers.js` | DOES NOT EXIST | Rename from Aug-4 plan NOT completed |
| pg pool | `lib/pg_database.js` | ACTIVE — SCOPE EXPANDED | NOW imported by cron-scheduler, event-consumer, outbox-relay, startup/index.js; was "RLS only" |
| Holdout client | `lib/clients.js` → `getHoldoutClient()` | ACTIVE | Separate Supabase instance for evaluation |
| Storage | `lib/storage.js` | ACTIVE | Supabase Storage uploads |

---

## SECTION 11: INTERFACE

| Component | File | Classification | Evidence |
|-----------|------|---------------|---------|
| Primary dashboard | `public/dashboard.html` | ACTIVE — CANONICAL | 1.2MB / 20,826 lines (was 602KB in project memory) |
| Document editor | `public/editor.html` | ACTIVE — SECONDARY | 4.5K |
| PWA manifest | `public/manifest.json` | ACTIVE | PWA support |
| Service worker | `public/sw.js` | ACTIVE | Push notifications + offline |
| CSS primary | `public/apex-v2.css` | ACTIVE | 55.7K stylesheet |
| CSS custom | `public/apex-custom.css` | ACTIVE | 99B customization overrides |
| Electron wrapper | `public/apex-electron.js` | UNKNOWN | 4.7K; desktop wrapper |

---

## SECTION 12: ROUTES

47 route files in `routes/`. New since Aug-4: `reality-architecture.js` (confirmed by 2026-07-11 commit "Reality Architecture dashboard page"). Deleted: `civilisation.js` (`D` in git status). `src/routes/` contains 4 additional duplicate route files.

---

## SECTION 13: MIGRATIONS

- Total: 82 numbered SQL migrations (001–082)
- Highest: `082_domain_id_propagation.sql`
- Migrations 080–082: ALL UNTRACKED (`??`) — never committed, never applied to production
- Migration 080 (`constitutional_records`) is the critical Wave 3 prerequisite — NOT in production

---

*APEX-SYSTEM-INVENTORY.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
