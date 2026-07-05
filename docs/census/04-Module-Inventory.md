# 04 — Module Inventory

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

Every logical module discovered. Status is based on file presence, not runtime execution.

---

## Module Index

| # | Module | Location | Status |
|---|--------|----------|--------|
| M01 | Server Core | `server.js` (222 KB) | Production |
| M02 | Agent System | `agent-system/` | Production |
| M03 | Cognitive Layer | `lib/cognitive/` | Production |
| M04 | Constitution Engine | `lib/constitution/` | Production |
| M05 | Executive Council | `lib/executive/` | Production |
| M06 | Finance Engine | `lib/finance/` | Production |
| M07 | Memory System | `lib/memory/` | Production |
| M08 | Intelligence Layer | `lib/intelligence/` | Production |
| M09 | Governance | `lib/governance*.js` | Production |
| M10 | Orchestration | `lib/orchestration/` | Production |
| M11 | Founder System | `lib/founder/` | Production |
| M12 | Empire Graph | `lib/empire/` | Production |
| M13 | Runtime Controllers | `lib/runtime/` | Production |
| M14 | Evolution System | `lib/evolution/` | Production |
| M15 | Synthetic/Holdout | `lib/synthetic/` | Production |
| M16 | Civilization Kernel | `middleware/civilization-kernel.js` | Production |
| M17 | Routes Layer | `routes/` (40 files) | Production |
| M18 | Services Layer | `services/` | Production |
| M19 | Event Bus | `lib/event-bus.js`, `lib/event-consumer.js` | Production |
| M20 | Outbox Pattern | `lib/write-with-outbox.js`, `lib/outbox-relay.js` | Production |
| M21 | Database | `lib/pg_database.js`, `lib/pg_helpers.js` | Production |
| M22 | Storage | `lib/storage.js` | Production |
| M23 | Auth | `lib/app-auth.js` | Production |
| M24 | Model Abstraction | `lib/models/` | Production |
| M25 | Attention Engine | `lib/attention/attention-engine.js` | Production |
| M26 | Goal Graph | `lib/goals/goal-graph.js` | Production |
| M27 | Economic Engine | `lib/economics/economic-engine.js` | Production |
| M28 | Integrity Crons | `lib/integrity-crons.js` | Production |
| M29 | Cron Scheduler | `lib/cron-scheduler.js`, `lib/cron-logger.js` | Production |
| M30 | Certification | `lib/certification/` | Production |
| M31 | Audit Ledger | `lib/audit/decision_ledger.js` | Production |
| M32 | Health Monitor | `lib/health/` | Production |
| M33 | Knowledge Graph | `lib/memory/knowledge-graph.js` | Production |
| M34 | Entities | `lib/entities/` | Production |
| M35 | Simulation | `lib/simulation/scenario_simulator.js` | Production |
| M36 | RAG Sidecar | `sidecar/main.py` | Production |
| M37 | Task Router | `runtime/task-router.js` | Production |
| M38 | PWA | `lib/pwa/`, `public/sw.js`, `public/manifest.json` | Production |
| M39 | WebSocket | `lib/ws-handler.js` | Production |
| M40 | Embedding | `lib/embed.js` | Production |
| M41 | Canonical JSON | `lib/canonical-json.js` | Production |
| M42 | Cipher/Secrets | `lib/secrets/vault.js` | Production |
| M43 | Dashboard UI | `public/dashboard.html`, `apex-v2.css` | Production |
| M44 | PlasmaOrb | `src/components/orb/PlasmaOrb.js` | Unknown |
| M45 | Graphify | `graphify-out/`, skill files | Production |
| M46 | GitNexus | `.gitnexus/`, MCP config | Production |
| M47 | Ruflo Orchestration | `.claude/`, `.claude-flow/`, `.swarm/` | Production |
| M48 | Agent Library (vault) | `APEX AI OS/11 Agents/` | Specification |
| M49 | Knowledge Vault | `APEX AI OS/09 Knowledge/` | Production |
| M50 | Obsidian Plugin | `.obsidian/plugins/obsidian-local-rest-api/` | Active |

---

## Module Detail: M01 — Server Core

**Entry point:** `server.js`  
**Size:** 222 KB — largest single file  
**Language:** JavaScript/Node.js  
**Framework:** Express 5.x  
**Role:** Monolithic backend. Contains routes, agent dispatch logic, cron registration, WebSocket setup, initialization, and service wiring.  
**Dependencies:** All other modules  
**Consumers:** Render hosting, dashboard.html frontend  
**Rule per CLAUDE.md:** Must not be shortened or have working features removed.

---

## Module Detail: M02 — Agent System

**Path:** `agent-system/` (44 files)

| File | Purpose |
|------|---------|
| `adaptation-engine.js` | Behavioral adaptation |
| `adaptation-registry.json` | Adaptation state |
| `agent-library.js` | Agent template library |
| `agent-pipeline-hooks.js` | Pipeline hook callbacks |
| `agent-registry.js` | Agent registration and lookup |
| `agent-reputation.js` | Agent trust/reputation scoring |
| `agents.js` | Agent dispatch entry |
| `autonomy-metrics.js` | Autonomy level metrics |
| `backup-manager.js` | Backup operations |
| `browser-agent.js` | Browser automation agent (Playwright) |
| `capture-classifier.js` | Input capture classification |
| `cloud_autopilot.js` | Cloud execution autopilot |
| `confidence-estimator.js` | Confidence scoring |
| `cs249r-reader.js` | CS249R course notes reader |
| `domain-agents.js` | Domain-specific agent dispatch |
| `dynamic-agent-selector.js` | Runtime agent selection |
| `email_agent.js` | Email handling agent |
| `episodic-memory.js` | Episodic memory management |
| `execution-verifier.js` | Execution verification |
| `finance_agent.js` | Finance domain agent |
| `firecrawl-bridge.js` | Firecrawl web crawl bridge |
| `goal-tracker.js` | Goal tracking |
| `impeccable-validator.js` | Impeccable package validation |
| `improvement-executor.js` | Self-improvement execution |
| `langchain-memory.js` | LangChain memory integration |
| `langchain-rag.js` | LangChain RAG integration |
| `markitdown-bridge.js` | Markitdown document bridge |
| `master-orchestrator.js` | Master agent orchestration |
| `mastra_agents.js` | Mastra framework agents |
| `memory-indexer.js` | Memory indexing |
| `memory-retriever.js` | Memory retrieval |
| `multi-agent-coordinator.js` | Multi-agent coordination |
| `news-ingest.js` | News ingestion |
| `obsidian-client.js` | Obsidian Local REST API client |
| `obsidian-memory.js` | Obsidian as memory backend |
| `orchestrator.js` | Core orchestrator (fail-closed gate via `_runtimeCtrlError`) |
| `planning-quality-registry.js` | Planning quality tracking |
| `prompt-expander.js` | Prompt expansion |
| `rag-bridge.js` | RAG sidecar bridge |
| `reflection_agent.js` | Reflection agent |
| `reflection-engine.js` | Reflection processing |
| `routine_agent.js` | Routine/cron agent |
| `self-evaluator.js` | Self-evaluation |
| `supabase-setup.js` | Supabase initialization |
| `task-planner.js` | Task planning |
| `wiki-reader.js` | Wiki/knowledge reader |

---

## Module Detail: M03 — Cognitive Layer

**Path:** `lib/cognitive/` (30+ files)

| Sub-module | Files |
|------------|-------|
| Core engines | `behavior-modification-engine.js`, `chat-cognitive-layer.js`, `cognitive-digital-twin.js`, `cognitive-evolution-engine.js`, `cognitive-performance-engine.js`, `cognitive-policy-engine.js`, `cognitive-validation-framework.js`, `confidence-aware-autonomy-engine.js` |
| Effectiveness | `effectiveness/digital-twin-accuracy-engine.js`, `effectiveness/outcome-attribution-engine.js` |
| Evolution | `evolution/policy-evolution-engine.js` |
| Reporting | `reporting/intelligence-evolution-reporter.js` |
| Runtime controllers | `runtime/adaptive-router-controller.js`, `runtime/autonomy-runtime-controller.js`, `runtime/behavior-runtime-controller.js`, `runtime/cognitive-feedback-loop.js`, `runtime/digital-twin-gate.js`, `runtime/execution-runtime-controller.js`, `runtime/index.js`, `runtime/planning-runtime-controller.js`, `runtime/reasoning-runtime-controller.js`, `runtime/self-optimization-engine.js` |
| Strategy/skill | `execution-influence-engine.js`, `execution-strategy-engine.js`, `knowledge-decay-engine.js`, `meta-reasoning-engine.js`, `organizational-intelligence-engine.js`, `planning-strategy-engine.js`, `reasoning-strategy-engine.js`, `retrieval-evaluation-engine.js`, `retrieval-policy-engine.js`, `skill-routing-advisor.js` |
| Benchmarks | `benchmarks/benchmark-runner.js`, `benchmarks/scenarios.js` |

---

## Module Detail: M06 — Finance Engine

**Path:** `lib/finance/` (30+ files)

| Sub-module | Files |
|------------|-------|
| Core | `cashflow-engine.js`, `dashboard-summary.js`, `decision-support.js`, `duplicate-detector.js`, `financial-health-score.js`, `financial-retrieval.js`, `forecast-engine.js`, `goal-engine.js`, `opportunity-engine.js`, `reconciliation-engine.js`, `scenario-engine.js`, `spending-intelligence.js`, `transaction-provenance.js`, `import-batch-registry.js` |
| Import pipeline | `import/canonical-event-builder.js`, `import/document-classifier.js`, `import/duplicate-detector.js`, `import/import-batch-manager.js`, `import/import-parser.js`, `import/import-validator.js`, `import/index.js` |
| Sync | `sync/account-discovery.js`, `sync/balance-sync.js`, `sync/index.js`, `sync/sync-health.js`, `sync/sync-provenance.js`, `sync/sync-scheduler.js`, `sync/transaction-sync.js` |
| Tax | `tax/compliance-review.js`, `tax/deduction-opportunity-engine.js`, `tax/evidence-completeness.js`, `tax/expense-classifier.js`, `tax/index.js`, `tax/tax-exposure-engine.js`, `tax/year-end-readiness.js` |

---

## Module Detail: M07 — Memory System

**Path:** `lib/memory/` (22 files)

| File | Purpose |
|------|---------|
| `access-controller.js` | Memory access control |
| `adaptation-cycle.js` | Adaptation memory cycle |
| `cache.js` | Memory cache |
| `consolidation-engine.js` | Memory consolidation |
| `decision-memory.js` | Decision memory layer |
| `episodic-memory-pg.js` | Episodic memory in PostgreSQL |
| `founder-memory.js` | Founder-specific memory |
| `gateway.js` | Memory gateway (access point) |
| `governance-synthesizer.js` | Governance memory synthesis |
| `importance-engine.js` | Memory importance scoring |
| `improvement-engine.js` | Improvement memory |
| `index.js` | Module entry |
| `knowledge-graph.js` | Knowledge graph memory |
| `memory-governor.js` | Memory governance |
| `policy-extractor.js` | Policy extraction from memory |
| `procedural-memory.js` | Procedural/how-to memory |
| `reflexion-ranker.js` | Reflexion ranking |
| `reflexion-tracker.js` | Reflexion tracking |
| `sanitizer.js` | Memory sanitization |
| `semantic-memory.js` | Semantic memory layer |
| `skill-memory.js` | Skill memory |
| `strategic-memory.js` | Strategic memory |
| `working-memory.js` | Working memory |

---

## Module Detail: M17 — Routes Layer

**Path:** `routes/` (40 files)

| Route file | Domain |
|------------|--------|
| `agents.js` | Agent management |
| `briefing.js` | Daily/weekly briefings |
| `career.js` | Career tracking |
| `civilization.js` | Civilization metrics |
| `cognitive.js` | Cognitive layer API |
| `cognitive-eval.js` | Cognitive evaluation |
| `cognitive-evolution.js` | Cognitive evolution |
| `communications.js` | Communications (email/calendar/contacts) |
| `emails.js` | Email management |
| `empire.js` | Empire graph |
| `entities.js` | Entity management |
| `executive-performance.js` | Executive KPIs |
| `finance.js` | Financial operations |
| `founder.js` | Founder profile |
| `founder-graph.js` | Founder knowledge graph |
| `gemini-live.js` | Google Gemini Live integration |
| `governance.js` | Governance APIs |
| `health.js` | Health domain |
| `integrations.js` | Third-party integrations |
| `intelligence.js` | Intelligence layer |
| `intelligence-memory.js` | Intelligence memory |
| `intent.js` | Intent detection |
| `journal.js` | Journaling |
| `knowledge-graph.js` | Knowledge graph APIs |
| `legal.js` | Legal domain |
| `life.js` | Life operations |
| `memory.js` | Memory operations |
| `nutrition.js` | Nutrition tracking |
| `observatory.js` | System observatory |
| `operations.js` | Operations management |
| `property.js` | Property tracking |
| `pwa.js` | PWA push notifications |
| `relationships.js` | Relationship management |
| `shopping.js` | Shopping operations |
| `social.js` | Social media |
| `spiritual.js` | Spiritual/mindfulness domain |
| `strategic.js` | Strategic planning |
| `travel.js` | Travel management |
| `tts-gemini.js` | Google TTS via Gemini |
| `university.js` | University domain |
| `voice-chat.js` | Voice chat interface |
| `wealth.js` | Wealth management |

---

## Module Detail: M18 — Services Layer

**Path:** `services/`

| Service | Files |
|---------|-------|
| Notion | `notion-client.js`, `notion-clients.js`, `notion-projects.js`, `notion-sync.js`, `notion-tasks.js`, `index.js` |
| Slack | `slack-agents.js`, `slack-alerts.js`, `slack-briefings.js`, `slack-client.js`, `slack-system-health.js`, `index.js` |
| Pipelines | `agent-pipeline-hooks.js`, `daily-briefing-pipeline.js`, `lead-pipeline.js`, `weekly-review-pipeline.js`, `index.js` |
| Sync | `supabase-notion-sync.js`, `index.js` |
| Root | `index.js`, `init.js` |

---

## Modules with Duplicate Implementations

| Module | Instance 1 | Instance 2 |
|--------|-----------|-----------|
| reality_loop | `lib/intelligence/reality-loop.js` | `lib/reality/reality_loop.js` |
| graphify-out | `graphify-out/` | `dev-tools/graphify-out/` |
| sidecar main.py | `sidecar/main.py` | `runtime/sidecar/main.py` |
| outbox relay | `lib/outbox-relay.js` | (embedded in server.js?) |
| finance duplicate-detector | `lib/finance/duplicate-detector.js` | `lib/finance/import/duplicate-detector.js` |

---

## Modules with Unknown Status

| Module | Reason |
|--------|--------|
| `lib/workspace.js` | File exists, purpose unknown |
| `src/components/orb/PlasmaOrb.js` | Isolated component, no parent discovered |
| `src/routes/telemetry/index.js` | Telemetry route, relationship to main routes unknown |
| `src/workers/cron.js` | Separate cron worker, relationship to main cron-scheduler unknown |
| `utils/math.js` | Unknown consumers |
| `test-data-generator/` | Contents not enumerated |
| `workspace/` | Contents not enumerated |
| `piper_server/` | Contents not enumerated |
| `backups/` | Contents not enumerated |
