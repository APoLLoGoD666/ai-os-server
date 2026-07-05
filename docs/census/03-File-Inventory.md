# 03 — File Inventory

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only. Sizes obtained where discoverable. Purpose inferred from filename and directory context only — no file contents read unless previously cached in session.

---

## How to Read This Document

Each section covers one directory. Columns:

| Column | Meaning |
|--------|---------|
| File | Filename only |
| Ext | Extension |
| Lang | Language |
| Purpose | Inferred from name/path |
| Status | Production / Dev / Validation / Unknown / Duplicate / Generated / Unused |

---

## Root Files (`Scripts/`)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `server.js` | .js | JavaScript | Primary backend — Express server, all route mounting, WebSocket, agent boot | Production |
| `agents.js` | .js | JavaScript | Agent definitions or entry point (relationship to agent-system/ unclear) | Unknown |
| `instrument.js` | .js | JavaScript | OpenTelemetry instrumentation (duplicate of scripts/instrument.js) | Duplicate |
| `apex-v2.css` | .css | CSS | Main dashboard stylesheet (duplicate of public/apex-v2.css) | Duplicate |
| `apex-custom.css` | .css | CSS | Dashboard style overrides (duplicate of public/apex-custom.css) | Duplicate |
| `apex-audit.html` | .html | HTML | Audit visualisation dashboard (78 KB) | Production |
| `dashboard.html` | .html | HTML | Dashboard UI entry — relationship to public/dashboard.html UNKNOWN | Unknown |
| `editor.html` | .html | HTML | Editor UI (4.5 KB, duplicate of public/editor.html) | Duplicate |
| `manifest.json` | .json | JSON | PWA manifest (1.1 KB, duplicate of public/manifest.json) | Duplicate |
| `memory.json` | .json | JSON | Memory state file (duplicate of data/memory.json) | Duplicate |
| `notifications.json` | .json | JSON | Notifications state (4 B, duplicate of data/notifications.json) | Duplicate |
| `timeline.json` | .json | JSON | Timeline state (4 B, duplicate of data/timeline.json) | Duplicate |
| `deploy-trigger.json` | .json | JSON | Render deploy trigger payload (2 B) | Production |
| `render-deploy-response.json` | .json | JSON | Cached Render API response | Generated |
| `package.json` | .json | JSON | npm manifest — 31 dependencies, scripts | Production |
| `package-lock.json` | .json | JSON | npm lockfile (auto-generated) | Generated |
| `render.yaml` | .yaml | YAML | Render deployment config — 2 services | Production |
| `CLAUDE.md` | .md | Markdown | AI coding instructions (6.9 KB) | Production |
| `CONSTITUTION.md` | .md | Markdown | System constitution — 6 articles (6.3 KB) | Production |
| `ROADMAP.md` | .md | Markdown | Feature roadmap — 100+ features across 8 workstreams | Production |
| `TASKS.md` | .md | Markdown | Current task list (407 B) | Production |
| `.env` | (none) | Plaintext | Live environment secrets — not committed | Production |
| `.env.example` | .example | Plaintext | 64 env variable slots — template | Production |
| `.env.vault` | .vault | Encrypted | Encrypted env backup — format unknown | Production |
| `.gitignore` | (none) | Plaintext | Git exclusion rules | Production |
| `.mcp.json` | .json | JSON | MCP server config — 5 servers (notion, gitnexus, ruflo, ruv-swarm, flow-nexus) | Production |
| `.npmrc` | (none) | Plaintext | npm config (likely --legacy-peer-deps) | Production |
| `.coderabbit.yaml` | .yaml | YAML | CodeRabbit AI code review config | Production |
| `.claude-session-lock.json` | .json | JSON | Session lock — schema unknown | Unknown |

---

## agent-system/ (44 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `orchestrator.js` | .js | JS | Primary agent orchestrator — _runtimeCtrlError fail-closed gate | Production |
| `master-orchestrator.js` | .js | JS | Master-level orchestrator above primary | Production |
| `multi-agent-coordinator.js` | .js | JS | Coordinates multiple agents in parallel | Production |
| `agents.js` | .js | JS | Agent definitions for agent-system | Production |
| `domain-agents.js` | .js | JS | Domain-specific agent implementations | Production |
| `email_agent.js` | .js | JS | Email domain agent | Production |
| `finance_agent.js` | .js | JS | Finance domain agent | Production |
| `routine_agent.js` | .js | JS | Routine/habit agent | Production |
| `browser-agent.js` | .js | JS | Playwright-powered browser automation agent | Production |
| `cloud_autopilot.js` | .js | JS | Cloud operations autopilot | Production |
| `reflection_agent.js` | .js | JS | Reflection and self-evaluation agent (duplicate of scripts/reflection_agent.js) | Duplicate |
| `reflection-engine.js` | .js | JS | Core reflection engine | Production |
| `agent-library.js` | .js | JS | Library of agent templates/specs | Production |
| `agent-registry.js` | .js | JS | Agent registration and discovery | Production |
| `agent-pipeline-hooks.js` | .js | JS | Pipeline hooks for agent execution (duplicate of services/pipelines/agent-pipeline-hooks.js) | Duplicate |
| `adaptation-engine.js` | .js | JS | Agent adaptation engine | Production |
| `adaptation-registry.json` | .json | JSON | Adaptation rules/registry data | Production |
| `agent-reputation.js` | .js | JS | Agent reputation scoring | Production |
| `autonomy-metrics.js` | .js | JS | Autonomy level metrics | Production |
| `backup-manager.js` | .js | JS | Backup management for agent data | Production |
| `capture-classifier.js` | .js | JS | Classifies captured inputs | Production |
| `confidence-estimator.js` | .js | JS | Estimates agent confidence | Production |
| `cs249r-reader.js` | .js | JS | CS249R course material reader | Production |
| `dynamic-agent-selector.js` | .js | JS | Dynamically selects appropriate agent | Production |
| `episodic-memory.js` | .js | JS | Agent-level episodic memory interface | Production |
| `execution-verifier.js` | .js | JS | Verifies agent execution correctness | Production |
| `firecrawl-bridge.js` | .js | JS | Firecrawl web crawler integration | Production |
| `goal-tracker.js` | .js | JS | Agent goal tracking | Production |
| `impeccable-validator.js` | .js | JS | Uses `impeccable` package for validation | Production |
| `improvement-executor.js` | .js | JS | Executes improvement proposals | Production |
| `langchain-memory.js` | .js | JS | LangChain memory integration | Production |
| `langchain-rag.js` | .js | JS | LangChain RAG pipeline | Production |
| `markitdown-bridge.js` | .js | JS | Markdown conversion bridge | Production |
| `mastra_agents.js` | .js | JS | Mastra framework agents | Production |
| `memory-indexer.js` | .js | JS | Memory indexing operations | Production |
| `memory-retriever.js` | .js | JS | Memory retrieval operations | Production |
| `news-ingest.js` | .js | JS | News ingestion pipeline | Production |
| `obsidian-client.js` | .js | JS | Obsidian REST API client | Production |
| `obsidian-memory.js` | .js | JS | Obsidian-backed memory layer | Production |
| `planning-quality-registry.js` | .js | JS | Registry for planning quality scores | Production |
| `prompt-expander.js` | .js | JS | Prompt expansion and enrichment | Production |
| `rag-bridge.js` | .js | JS | RAG sidecar bridge | Production |
| `self-evaluator.js` | .js | JS | Self-evaluation engine | Production |
| `supabase-setup.js` | .js | JS | Supabase initialisation utilities | Production |
| `task-planner.js` | .js | JS | Task decomposition and planning | Production |
| `wiki-reader.js` | .js | JS | Vault wiki reader | Production |

---

## routes/ (42 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `agents.js` | .js | JS | Agent CRUD and execution endpoints | Production |
| `briefing.js` | .js | JS | Daily briefing generation routes | Production |
| `career.js` | .js | JS | Career management routes | Production |
| `civilization.js` | .js | JS | Civilization health cycle routes | Production |
| `cognitive.js` | .js | JS | Cognitive state and policy routes | Production |
| `cognitive-eval.js` | .js | JS | Cognitive evaluation endpoints | Production |
| `cognitive-evolution.js` | .js | JS | Cognitive evolution management routes | Production |
| `communications.js` | .js | JS | Communications domain routes | Production |
| `emails.js` | .js | JS | Gmail/email integration routes | Production |
| `empire.js` | .js | JS | Empire graph routes | Production |
| `entities.js` | .js | JS | Entity registry routes | Production |
| `executive-performance.js` | .js | JS | Executive KPI and performance routes | Production |
| `finance.js` | .js | JS | Finance domain routes | Production |
| `founder.js` | .js | JS | Founder profile and state routes | Production |
| `founder-graph.js` | .js | JS | Founder knowledge graph routes | Production |
| `gemini-live.js` | .js | JS | Google Gemini Live API routes | Production |
| `governance.js` | .js | JS | Governance health and probe routes | Production |
| `health.js` | .js | JS | Health monitoring routes (system) | Production |
| `integrations.js` | .js | JS | External integration management routes | Production |
| `intelligence.js` | .js | JS | Intelligence engine routes | Production |
| `intelligence-memory.js` | .js | JS | Intelligence-memory bridge routes | Production |
| `intent.js` | .js | JS | Intent detection and classification routes | Production |
| `journal.js` | .js | JS | Journaling and psychology routes | Production |
| `knowledge-graph.js` | .js | JS | Knowledge graph query routes | Production |
| `legal.js` | .js | JS | Legal domain routes | Production |
| `life.js` | .js | JS | Life operations domain routes | Production |
| `memory.js` | .js | JS | Memory read/write API routes | Production |
| `nutrition.js` | .js | JS | Nutrition tracking routes | Production |
| `observatory.js` | .js | JS | System observatory and observability routes | Production |
| `operations.js` | .js | JS | Business operations routes | Production |
| `property.js` | .js | JS | Property management routes | Production |
| `pwa.js` | .js | JS | PWA push notification routes | Production |
| `relationships.js` | .js | JS | Relationship management routes | Production |
| `shopping.js` | .js | JS | Shopping and purchasing routes | Production |
| `social.js` | .js | JS | Social media and networking routes | Production |
| `spiritual.js` | .js | JS | Spiritual progression routes | Production |
| `strategic.js` | .js | JS | Strategic planning routes | Production |
| `travel.js` | .js | JS | Travel management routes | Production |
| `tts-gemini.js` | .js | JS | Google TTS via Gemini routes | Production |
| `university.js` | .js | JS | University/education routes | Production |
| `voice-chat.js` | .js | JS | Voice chat and transcription routes | Production |
| `wealth.js` | .js | JS | Wealth building routes | Production |

---

## lib/ Root Files (~50 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `pg_database.js` | .js | JS | Supabase JS database connection (NOT raw pg pool) | Production |
| `pg_helpers.js` | .js | JS | PostgreSQL query helper utilities | Production |
| `storage.js` | .js | JS | Supabase Storage file operations | Production |
| `write-with-outbox.js` | .js | JS | Atomic outbox writes via write_outbox_with_state RPC | Production |
| `outbox-relay.js` | .js | JS | Processes outbox events — _sb singleton | Production |
| `integrity-crons.js` | .js | JS | backup + reconcile integrity cron jobs | Production |
| `cron-scheduler.js` | .js | JS | Cron job registration and management | Production |
| `event-bus.js` | .js | JS | In-process event routing | Production |
| `event-consumer.js` | .js | JS | Event consumption and handling | Production |
| `middleware.js` | .js | JS | Shared middleware utilities | Production |
| `app-auth.js` | .js | JS | Application authentication | Production |
| `logger.js` | .js | JS | Logging utilities | Production |
| `utils.js` | .js | JS | General utility functions | Production |
| `server-utils.js` | .js | JS | Server-specific utilities | Production |
| `constitution.js` | .js | JS | Runtime constitution interface | Production |
| `governance.js` | .js | JS | Governance engine | Production |
| `governance-meta.js` | .js | JS | Governance metadata layer | Production |
| `governance-probe.js` | .js | JS | Governance health probes | Production |
| `cognitive-orchestrator.js` | .js | JS | Cognitive orchestration coordinator | Production |
| `embed.js` | .js | JS | Embedding generation utilities | Production |
| `clients.js` | .js | JS | External API client initialisation | Production |
| `chat-context.js` | .js | JS | Chat context assembly | Production |
| `kernel.js` | .js | JS | System kernel — callers unknown | Unknown |
| `workspace.js` | .js | JS | Workspace management — purpose unknown | Unknown |
| `auto-pipeline.js` | .js | JS | Autonomous pipeline execution | Unknown |
| `agent-command-handler.js` | .js | JS | Agent command processing | Production |
| `agent-execution-utils.js` | .js | JS | Agent execution helper utilities | Production |
| `agent-file-utils.js` | .js | JS | File operation utilities for agents | Production |
| `agent-plan-utils.js` | .js | JS | Planning utilities for agents | Production |
| `agent-queue.js` | .js | JS | Agent task queue management | Production |
| `agent-step-utils.js` | .js | JS | Step execution utilities | Production |
| `agent-task-cycle.js` | .js | JS | Agent task lifecycle management | Production |
| `apex-tools.js` | .js | JS | APEX tool definitions for Claude API | Production |
| `tool-executor.js` | .js | JS | Tool call execution engine | Production |
| `db-migrate.js` | .js | JS | Database migration runner | Production |
| `cron-logger.js` | .js | JS | Cron job logging | Production |
| `canonical-json.js` | .js | JS | Canonical JSON serialisation | Production |
| `consumption-log.js` | .js | JS | API consumption logging | Production |
| `counter.js` | .js | JS | Counter utilities | Production |
| `evidence-completeness.js` | .js | JS | Evidence completeness checking | Production |
| `executive-arbitration-engine.js` | .js | JS | Executive decision arbitration | Production |
| `latency-tracker.js` | .js | JS | Request latency tracking | Production |
| `persistent-cognition-manager.js` | .js | JS | Persistent cognitive state — callers unknown | Unknown |
| `response-timing-engine.js` | .js | JS | Response timing measurement — callers unknown | Unknown |
| `runtime-readiness.js` | .js | JS | System readiness checks — callers unknown | Unknown |
| `session-state-registry.js` | .js | JS | Session state tracking — callers unknown | Unknown |
| `strategic-planning-engine.js` | .js | JS | Strategic planning engine | Production |
| `ws-handler.js` | .js | JS | WebSocket message handler | Production |

---

## lib/cognitive/ (~30 files across 5 subdirs)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Cognitive module entry point | Production |
| `resolver.js` | .js | JS | Cognitive resolution engine | Production |
| `chat-cognitive-layer.js` | .js | JS | Cognitive layer for chat processing | Production |
| `behavior-modification-engine.js` | .js | JS | Behaviour modification logic | Production |
| `cognitive-digital-twin.js` | .js | JS | Digital twin for cognitive modelling | Production |
| `cognitive-evolution-engine.js` | .js | JS | Cognitive evolution over time | Production |
| `cognitive-performance-engine.js` | .js | JS | Performance measurement | Production |
| `cognitive-policy-engine.js` | .js | JS | Policy decision engine | Production |
| `cognitive-validation-framework.js` | .js | JS | Validation framework for cognitive outputs | Production |
| `confidence-aware-autonomy-engine.js` | .js | JS | Autonomy level adjusted by confidence | Production |
| `execution-influence-engine.js` | .js | JS | Influences execution decisions | Production |
| `execution-strategy-engine.js` | .js | JS | Execution strategy selection | Production |
| `knowledge-decay-engine.js` | .js | JS | Models knowledge decay over time | Production |
| `meta-reasoning-engine.js` | .js | JS | Meta-level reasoning | Production |
| `organizational-intelligence-engine.js` | .js | JS | Organisational intelligence | Production |
| `planning-strategy-engine.js` | .js | JS | Planning strategy selection | Production |
| `reasoning-strategy-engine.js` | .js | JS | Reasoning strategy selection | Production |
| `retrieval-evaluation-engine.js` | .js | JS | Evaluates retrieval quality | Production |
| `retrieval-policy-engine.js` | .js | JS | Retrieval policy control | Production |
| `skill-routing-advisor.js` | .js | JS | Routes requests to skill modules | Production |
| `benchmarks/benchmark-runner.js` | .js | JS | Cognitive benchmark execution | Production |
| `benchmarks/scenarios.js` | .js | JS | Benchmark scenario definitions | Production |
| `effectiveness/digital-twin-accuracy-engine.js` | .js | JS | Measures digital twin accuracy | Production |
| `effectiveness/outcome-attribution-engine.js` | .js | JS | Attributes outcomes to decisions | Production |
| `evolution/policy-evolution-engine.js` | .js | JS | Evolves policies over time | Production |
| `reporting/intelligence-evolution-reporter.js` | .js | JS | Reports on intelligence evolution | Production |
| `runtime/index.js` | .js | JS | Runtime cognitive controllers index | Production |
| `runtime/adaptive-router-controller.js` | .js | JS | Adaptive routing at runtime | Unknown |
| `runtime/autonomy-runtime-controller.js` | .js | JS | Autonomy control at runtime | Unknown |
| `runtime/behavior-runtime-controller.js` | .js | JS | Behaviour control at runtime | Unknown |
| `runtime/cognitive-feedback-loop.js` | .js | JS | Cognitive feedback processing | Unknown |
| `runtime/digital-twin-gate.js` | .js | JS | Digital twin gate check | Unknown |
| `runtime/execution-runtime-controller.js` | .js | JS | Execution control at runtime | Unknown |
| `runtime/planning-runtime-controller.js` | .js | JS | Planning control at runtime | Unknown |
| `runtime/reasoning-runtime-controller.js` | .js | JS | Reasoning control at runtime | Unknown |
| `runtime/self-optimization-engine.js` | .js | JS | Self-optimisation at runtime | Unknown |

---

## lib/constitution/ (60+ files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Constitution module entry | Production |
| `spec.js` | .js | JS | Constitution specification | Production |
| `steward.js` | .js | JS | Constitution steward | Production |
| `watchdog.js` | .js | JS | Constitutional watchdog | Production |
| `amendments.json` | .json | JSON | Amendment log — contents not read | Unknown |
| `baseline.json` | .json | JSON | Constitutional baseline — contents not read | Unknown |
| `accountability-chain.json` | .json | JSON | Accountability chain data — not read | Unknown |
| `accountability-chain.js` | .js | JS | Accountability chain engine | Production |
| `anomaly-escalator.js` | .js | JS | Escalates detected anomalies | Production |
| `arbitrator.js` | .js | JS | Decision arbitration | Production |
| `authority-resistance.js` | .js | JS | Resists inappropriate authority | Production |
| `blind-spot-discoverer.js` | .js | JS | Discovers system blind spots | Production |
| `cascade-failure-detector.js` | .js | JS | Detects cascade failure patterns | Production |
| `closure-auditor.js` | .js | JS | Audits decision closure | Production |
| `collective-stewardship.js` | .js | JS | Collective stewardship logic | Production |
| `confabulation-guard.js` | .js | JS | Guards against confabulation | Production |
| `consensus-immunity.js` | .js | JS | Immunity against false consensus | Production |
| `constitutional-load-tester.js` | .js | JS | Load tests constitutional constraints | Production |
| `constitutional-trust-assessor.js` | .js | JS | Assesses constitutional trust | Production |
| `contradiction-manager.js` | .js | JS | Manages contradictions | Production |
| `course-corrector.js` | .js | JS | Course correction engine | Production |
| `crisis-manager.js` | .js | JS | Crisis management logic | Production |
| `cross-domain-arbitrator.js` | .js | JS | Cross-domain decision arbitration | Production |
| `deception-detector.js` | .js | JS | Detects deceptive patterns | Production |
| `decision-tracer.js` | .js | JS | Traces decisions through constitution | Production |
| `deployment-monitor.js` | .js | JS | Monitors deployment safety | Production |
| `drift-detector.js` | .js | JS | Detects constitutional drift | Production |
| `drift-resistance.js` | .js | JS | Resists drift from constitution | Production |
| `drift-surveillance.js` | .js | JS | Surveil for drift | Production |
| `ecological-engine.js` | .js | JS | Ecological balance engine | Production |
| `epistemic-auditor.js` | .js | JS | Audits epistemic claims | Production |
| `epistemic-humility.js` | .js | JS | Enforces epistemic humility | Production |
| `escalation-controller.js` | .js | JS | Controls escalation paths | Production |
| `escalation-governor.js` | .js | JS | Governs escalation decisions | Production |
| `evidence-synthesiser.js` | .js | JS | Synthesises evidence | Production |
| `evolutionary-humility.js` | .js | JS | Evolutionary humility constraints | Production |
| `evolution-manager.js` | .js | JS | Manages constitutional evolution | Production |
| `explanation-stability.js` | .js | JS | Ensures explanation stability | Production |
| `goal-engine.js` | .js | JS | Constitutional goal enforcement | Production |
| `identity-continuity.js` | .js | JS | Identity continuity across updates | Production |
| `identity-eligibility.js` | .js | JS | Eligibility assessment | Production |
| `identity-firewall.js` | .js | JS | Identity protection firewall | Production |
| `incentive-guard.js` | .js | JS | Guards against misaligned incentives | Production |
| `integration-scenarios.js` | .js | JS | Integration test scenarios | Production |
| `interpretation-manager.js` | .js | JS | Manages constitutional interpretation | Production |
| `introspective-auditor.js` | .js | JS | Introspective self-auditing | Production |
| `invariant-conflict-resolver.js` | .js | JS | Resolves invariant conflicts | Production |
| `invariant-guardian.js` | .js | JS | Guards constitutional invariants | Production |
| `memory-immune-system.js` | .js | JS | Memory immune system | Production |
| `memory-provenance.js` | .js | JS | Memory origin tracking | Production |
| `memory-trust-scorer.js` | .js | JS | Scores memory trustworthiness | Production |
| `meta-accountability.js` | .js | JS | Meta-level accountability | Production |
| `meta-identity.js` | .js | JS | Meta-identity management | Production |
| `meta-uncertainty.js` | .js | JS | Meta-level uncertainty tracking | Production |
| `modification-governor.js` | .js | JS | Governs self-modification | Production |
| `observation-registry.js` | .js | JS | Registry of constitutional observations | Production |
| `operational-accountability.js` | .js | JS | Operational accountability tracking | Production |
| `perspective-modeller.js` | .js | JS | Models multiple perspectives | Production |
| `public-interest-balancer.js` | .js | JS | Balances public interest | Production |
| `readiness-assessor.js` | .js | JS | Assesses constitutional readiness | Production |
| `reality-anchor.js` | .js | JS | Anchors decisions to reality | Production |
| `recovery-orchestrator.js` | .js | JS | Orchestrates recovery from violations | Production |
| `recursive-improver.js` | .js | JS | Recursive self-improvement within bounds | Production |
| `red-team.js` | .js | JS | Red team adversarial testing | Production |
| `relational-influence.js` | .js | JS | Relational influence modelling | Production |
| `residual-risk-registry.js` | .js | JS | Tracks residual constitutional risks | Production |
| `resource-allocator.js` | .js | JS | Constitutional resource allocation | Production |
| `risk-monitor.js` | .js | JS | Risk monitoring | Production |
| `rollback-manager.js` | .js | JS | Manages constitutional rollbacks | Production |
| `self-disconfirmation.js` | .js | JS | Self-disconfirmation logic | Production |
| `stewardship-obligations.js` | .js | JS | Stewardship obligation tracking | Production |
| `verdict-calibrator.js` | .js | JS | Calibrates constitutional verdicts | Production |

---

## lib/memory/ (22 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `gateway.js` | .js | JS | Single memory access gateway — all consumers route here | Production |
| `index.js` | .js | JS | Memory module entry | Production |
| `working-memory.js` | .js | JS | Working memory → Supabase | Production |
| `episodic-memory-pg.js` | .js | JS | Episodic memory → Supabase PostgreSQL | Production |
| `semantic-memory.js` | .js | JS | Semantic memory → Supabase | Production |
| `decision-memory.js` | .js | JS | Decision memory → Supabase | Production |
| `founder-memory.js` | .js | JS | Founder-specific memory layer | Production |
| `knowledge-graph.js` | .js | JS | Knowledge graph memory layer | Production |
| `cache.js` | .js | JS | In-process memory cache | Production |
| `access-controller.js` | .js | JS | Memory access control | Production |
| `adaptation-cycle.js` | .js | JS | Memory adaptation cycle | Production |
| `consolidation-engine.js` | .js | JS | Memory consolidation | Production |
| `governance-synthesizer.js` | .js | JS | Synthesises governance from memory | Production |
| `importance-engine.js` | .js | JS | Memory importance scoring | Production |
| `improvement-engine.js` | .js | JS | Memory improvement engine | Production |
| `memory-governor.js` | .js | JS | Memory governance | Production |
| `policy-extractor.js` | .js | JS | Extracts policies from memory | Production |
| `procedural-memory.js` | .js | JS | Procedural memory layer | Production |
| `reflexion-ranker.js` | .js | JS | Ranks reflexion insights | Production |
| `reflexion-tracker.js` | .js | JS | Tracks reflexion cycles | Production |
| `sanitizer.js` | .js | JS | Memory sanitisation | Production |
| `skill-memory.js` | .js | JS | Skill-specific memory layer | Production |
| `strategic-memory.js` | .js | JS | Strategic memory layer | Production |

---

## lib/intelligence/ (24 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Intelligence module entry | Production |
| `civilization-health-engine.js` | .js | JS | Civilization health scoring | Production |
| `civilization-runtime.js` | .js | JS | Civilization runtime management | Production |
| `context-composer.js` | .js | JS | Context composition for requests | Production |
| `contradiction-engine.js` | .js | JS | Contradiction detection and resolution | Production |
| `decision-intelligence.js` | .js | JS | Decision intelligence layer | Production |
| `decision-outcome-engine.js` | .js | JS | Decision outcome tracking | Production |
| `digital-twin-engine.js` | .js | JS | Digital twin modelling | Production |
| `executive-performance-engine.js` | .js | JS | Executive performance tracking | Production |
| `global-intelligence-engine.js` | .js | JS | Global intelligence aggregation | Production |
| `graph-reasoning-engine.js` | .js | JS | Graph-based reasoning | Production |
| `improvement-governor.js` | .js | JS | Governs improvement execution | Production |
| `knowledge-validator.js` | .js | JS | Knowledge validity checking | Production |
| `memory-lifecycle-engine.js` | .js | JS | Memory lifecycle management | Production |
| `memory-retrieval-engine.js` | .js | JS | Memory retrieval orchestration | Production |
| `opportunity-engine.js` | .js | JS | Opportunity identification engine | Production |
| `organizational-learning-engine.js` | .js | JS | Organisational learning | Production |
| `planning-influence-engine.js` | .js | JS | Influences planning decisions | Production |
| `reality-loop.js` | .js | JS | Reality feedback loop (duplicate of lib/reality/reality_loop.js) | Duplicate |
| `resource-authority-engine.js` | .js | JS | Resource authority management | Production |
| `sie.js` | .js | JS | Strategic Intelligence Engine (purpose inferred) | Unknown |
| `skill-evolution-engine.js` | .js | JS | Skill evolution tracking | Production |
| `strategy-engine.js` | .js | JS | Strategy management engine | Production |
| `value-creation-engine.js` | .js | JS | Value creation tracking | Production |

---

## lib/orchestration/ (25 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `architecture_coherence_layer.js` | .js | JS | Architectural coherence enforcement | Unknown |
| `execution_orchestrator.js` | .js | JS | Execution orchestration | Unknown |
| `governance_agent_adapter.js` | .js | JS | Adapter for governance agents | Unknown |
| `governance_agent_dispatcher.js` | .js | JS | Dispatches governance agents | Unknown |
| `governance_agent_execution_wrapper.js` | .js | JS | Wraps governance agent execution | Unknown |
| `governance_agent_plugin_discovery.js` | .js | JS | Discovers governance agent plugins | Unknown |
| `governance_agent_registry.js` | .js | JS | Registry of governance agents | Unknown |
| `governance_distributed_consistency_engine.js` | .js | JS | Distributed consistency | Unknown |
| `governance_distributed_state_coherence_report.js` | .js | JS | State coherence reporting | Unknown |
| `governance_distributed_trace_api.js` | .js | JS | Distributed trace API | Unknown |
| `governance_event_adapter.js` | .js | JS | Event adaptation layer | Unknown |
| `governance_event_broker.js` | .js | JS | Event brokering | Unknown |
| `governance_event_bus.js` | .js | JS | Governance event bus | Unknown |
| `governance_event_correlation_engine.js` | .js | JS | Event correlation | Unknown |
| `governance_event_schema_registry.js` | .js | JS | Event schema registry | Unknown |
| `governance_event_store.js` | .js | JS | Event store | Unknown |
| `governance_event_unified_model.js` | .js | JS | Unified event model | Unknown |
| `governance_execution_policy_router.js` | .js | JS | Policy-based execution routing | Unknown |
| `governance_global_state_view.js` | .js | JS | Global state view | Unknown |
| `governance_instrumentation.js` | .js | JS | Instrumentation for governance | Unknown |
| `governance_node_registry.js` | .js | JS | Node registry | Unknown |
| `governance_observability.js` | .js | JS | Governance observability | Unknown |
| `governance_query_api.js` | .js | JS | Query API for governance | Unknown |
| `governance_read_model.js` | .js | JS | Read model for CQRS pattern | Unknown |
| `governance_reconciliation_engine.js` | .js | JS | State reconciliation | Unknown |
| `governance_state_aggregator.js` | .js | JS | State aggregation | Unknown |

---

## lib/runtime/ (35+ files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `adaptation-simulator.js` | .js | JS | Simulates adaptations | Production |
| `assembler.js` | .js | JS | Runtime assembly | Production |
| `compensation-log.js` | .js | JS | Compensation action logging | Production |
| `concurrency-slot-manager.js` | .js | JS | Manages concurrent execution slots | Production |
| `constitutional-gate.js` | .js | JS | Constitutional gate for requests | Production |
| `constitutional-preflight.js` | .js | JS | Pre-flight constitutional check | Production |
| `counterfactual-evaluator.js` | .js | JS | Counterfactual scenario evaluation | Production |
| `decision-benchmark.js` | .js | JS | Decision benchmarking | Production |
| `decision-lattice.js` | .js | JS | Decision lattice structure | Production |
| `decision-provenance.js` | .js | JS | Tracks decision provenance | Production |
| `execution-context.js` | .js | JS | Execution context management | Production |
| `execution-evaluator.js` | .js | JS | Evaluates execution outcomes | Production |
| `execution-replay.js` | .js | JS | Replays execution for analysis | Production |
| `execution-transaction.js` | .js | JS | Transactional execution wrapper | Production |
| `governance-attestation.js` | .js | JS | Governance attestation | Production |
| `governance-compiler.js` | .js | JS | Compiles governance rules | Production |
| `governance-contract.js` | .js | JS | Governance contract enforcement | Production |
| `governance-manifest.js` | .js | JS | Governance manifest | Production |
| `governance-reproducibility.js` | .js | JS | Ensures reproducible governance | Production |
| `governance-traceability.js` | .js | JS | Governance traceability | Production |
| `improvement-lab.js` | .js | JS | Improvement experimentation | Production |
| `invariant-compiler.js` | .js | JS | Compiles system invariants | Production |
| `lattice-calibration-advisor.js` | .js | JS | Advises on lattice calibration | Production |
| `lattice-feedback-loop.js` | .js | JS | Lattice feedback processing | Production |
| `lattice-health-signal.js` | .js | JS | Lattice health signals | Production |
| `learning-ledger.js` | .js | JS | Ledger of learning events | Production |
| `outcome-lineage.js` | .js | JS | Outcome lineage tracking | Production |
| `outcome-registry.js` | .js | JS | Registry of outcomes | Production |
| `petl-middleware.js` | .js | JS | PETL (Parameter-Efficient Transfer Learning) middleware | Production |
| `policy-experiment.js` | .js | JS | Policy experimentation | Production |
| `recorder-policy.js` | .js | JS | Recording policy for events | Production |
| `resource-planner.js` | .js | JS | Resource planning | Production |
| `strategy-engine.js` | .js | JS | Runtime strategy engine | Production |

---

## lib/finance/ (38 files across 3 subdirs)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Finance module entry | Production |
| `cashflow-engine.js` | .js | JS | Cashflow analysis and projection | Production |
| `dashboard-summary.js` | .js | JS | Finance dashboard data | Production |
| `decision-support.js` | .js | JS | Financial decision support | Production |
| `duplicate-detector.js` | .js | JS | Detects duplicate transactions (duplicate of import/duplicate-detector.js) | Duplicate |
| `financial-health-score.js` | .js | JS | Financial health scoring | Production |
| `financial-retrieval.js` | .js | JS | Financial data retrieval | Production |
| `forecast-engine.js` | .js | JS | Financial forecasting | Production |
| `goal-engine.js` | .js | JS | Financial goal tracking | Production |
| `import-batch-registry.js` | .js | JS | Registry of import batches | Production |
| `opportunity-engine.js` | .js | JS | Financial opportunity identification | Production |
| `reconciliation-engine.js` | .js | JS | Transaction reconciliation | Production |
| `scenario-engine.js` | .js | JS | Financial scenario modelling | Production |
| `spending-intelligence.js` | .js | JS | Spending pattern analysis | Production |
| `transaction-provenance.js` | .js | JS | Transaction origin tracking | Production |
| `import/index.js` | .js | JS | Import pipeline entry | Production |
| `import/canonical-event-builder.js` | .js | JS | Builds canonical financial events | Production |
| `import/document-classifier.js` | .js | JS | Classifies financial documents | Production |
| `import/duplicate-detector.js` | .js | JS | Duplicate transaction detection | Production |
| `import/import-batch-manager.js` | .js | JS | Import batch management | Production |
| `import/import-parser.js` | .js | JS | Financial document parsing | Production |
| `import/import-validator.js` | .js | JS | Import validation | Production |
| `sync/index.js` | .js | JS | Sync module entry | Production |
| `sync/account-discovery.js` | .js | JS | Bank account discovery | Production |
| `sync/balance-sync.js` | .js | JS | Balance synchronisation | Production |
| `sync/sync-health.js` | .js | JS | Sync health monitoring | Production |
| `sync/sync-provenance.js` | .js | JS | Sync provenance tracking | Production |
| `sync/sync-scheduler.js` | .js | JS | Sync scheduling | Production |
| `sync/transaction-sync.js` | .js | JS | Transaction synchronisation | Production |
| `tax/index.js` | .js | JS | Tax module entry | Production |
| `tax/compliance-review.js` | .js | JS | Tax compliance review | Production |
| `tax/deduction-opportunity-engine.js` | .js | JS | Tax deduction opportunities | Production |
| `tax/evidence-completeness.js` | .js | JS | Tax evidence completeness | Production |
| `tax/expense-classifier.js` | .js | JS | Expense classification for tax | Production |
| `tax/tax-exposure-engine.js` | .js | JS | Tax exposure calculation | Production |
| `tax/year-end-readiness.js` | .js | JS | Year-end tax readiness | Production |

---

## lib/executive/ (7 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `cfo.js` | .js | JS | CFO executive role implementation | Production |
| `domain-memory.js` | .js | JS | Domain memory per executive | Production |
| `entity.js` | .js | JS | Executive entity model | Production |
| `executive-council.js` | .js | JS | Executive council coordination | Production |
| `financial-attention-scorer.js` | .js | JS | Financial attention scoring | Production |
| `registry.js` | .js | JS | Executive registry | Production |
| `trigger-evaluator.js` | .js | JS | Executive trigger evaluation | Production |

---

## lib/founder/ (11 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Founder module entry | Production |
| `alignment-engine.js` | .js | JS | Founder alignment checking | Production |
| `anti-goal-monitor.js` | .js | JS | Monitors for anti-goal violations | Production |
| `context-provider.js` | .js | JS | Provides founder context | Production |
| `graph.js` | .js | JS | Founder knowledge graph | Production |
| `graph-data.js` | .js | JS | Founder graph data | Production |
| `opportunity-scorer.js` | .js | JS | Scores opportunities for founder | Production |
| `privacy-guard.js` | .js | JS | Guards founder privacy | Production |
| `profile.js` | .js | JS | Founder profile data | Production |
| `state-tracker.js` | .js | JS | Founder state tracking | Production |
| `trait-evolution.js` | .js | JS | Founder trait evolution | Production |

---

## Other lib/ Subdirectories

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `attention/attention-engine.js` | .js | JS | Attention allocation engine | Production |
| `audit/decision_ledger.js` | .js | JS | Decision audit ledger | Production |
| `certification/checker.js` | .js | JS | Certification checking | Production |
| `certification/execution_certification_engine.js` | .js | JS | Execution certification | Production |
| `civilization/admission-engine.js` | .js | JS | Civilization admission logic | Production |
| `civilization/domain-scorer.js` | .js | JS | Domain-level scoring | Production |
| `deployment/deployment_covenant.js` | .js | JS | Deployment governance covenant — no confirmed consumer | Unknown |
| `economics/economic-engine.js` | .js | JS | Economic analysis engine | Production |
| `empire/graph.js` | .js | JS | Empire graph structure | Production |
| `empire/graph-data.js` | .js | JS | Empire graph data | Production |
| `empire/health.js` | .js | JS | Empire health metrics | Production |
| `empire/index.js` | .js | JS | Empire module entry | Production |
| `entities/relationship-consumer.js` | .js | JS | Entity relationship consumer | Production |
| `entities/resolver.js` | .js | JS | Entity resolver | Production |
| `evolution/change_admission_gate.js` | .js | JS | Change admission gating | Production |
| `evolution/evolution_contract.js` | .js | JS | Evolution contract enforcement | Production |
| `evolution/time_bound_architecture_snapshot_engine.js` | .js | JS | Time-bound architecture snapshots | Production |
| `goals/goal-graph.js` | .js | JS | Goal graph structure | Production |
| `health/anomaly-detector.js` | .js | JS | System health anomaly detection | Production |
| `health/containment.js` | .js | JS | Health issue containment | Production |
| `health/index.js` | .js | JS | Health module entry | Production |
| `health/monitor.js` | .js | JS | Health monitoring | Production |
| `integrity/system_integrity_manifest.js` | .js | JS | System integrity manifest | Production |
| `learning/truth_injection_contract.js` | .js | JS | Truth injection contract — no confirmed consumer | Unknown |
| `models/index.js` | .js | JS | Model provider index | Production |
| `models/feedback.js` | .js | JS | Model feedback processing | Production |
| `models/interface.js` | .js | JS | Model interface abstraction | Production |
| `models/output-capture.js` | .js | JS | Model output capture | Production |
| `models/registry.js` | .js | JS | Model registry | Production |
| `models/selector.js` | .js | JS | Model selection logic | Production |
| `models/providers/anthropic.js` | .js | JS | Anthropic provider implementation | Production |
| `models/providers/google.js` | .js | JS | Google provider implementation | Production |
| `models/runtime/index.js` | .js | JS | Runtime model management | Production |
| `models/runtime/subscriber.js` | .js | JS | Runtime model subscriber | Production |
| `pwa/icon-generator.js` | .js | JS | PWA icon generation — no confirmed consumer | Unknown |
| `pwa/notification-scheduler.js` | .js | JS | PWA notification scheduling | Production |
| `reality/reality_loop.js` | .js | JS | Reality feedback loop (duplicate of lib/intelligence/reality-loop.js) | Duplicate |
| `registry/autonomous_architecture_registry.js` | .js | JS | Architecture registry — no confirmed consumer | Unknown |
| `secrets/vault.js` | .js | JS | Secrets vault interface | Production |
| `simulation/scenario_simulator.js` | .js | JS | Scenario simulation — no confirmed consumer | Unknown |
| `state/state_replay.js` | .js | JS | State replay — no confirmed consumer | Unknown |
| `state/system_snapshot.js` | .js | JS | System snapshot — no confirmed consumer | Unknown |
| `synthetic/index.js` | .js | JS | Synthetic testing entry | Production |
| `synthetic/benchmark-runner.js` | .js | JS | Synthetic benchmark runner | Production |
| `synthetic/event-injector.js` | .js | JS | Synthetic event injection | Production |
| `synthetic/evidence-store.js` | .js | JS | Synthetic evidence storage | Production |
| `synthetic/execution-mode.js` | .js | JS | Synthetic execution mode control | Production |
| `synthetic/reality-scheduler.js` | .js | JS | Synthetic reality scheduling | Production |
| `synthetic/regression-runner.js` | .js | JS | Synthetic regression testing | Production |
| `synthetic/report-generator.js` | .js | JS | Synthetic test report generation | Production |
| `synthetic/scenario-generator.js` | .js | JS | Synthetic scenario generation | Production |
| `telemetry/aggregator.js` | .js | JS | Telemetry aggregation | Production |
| `temporal/session-tracker.js` | .js | JS | Session time tracking | Production |

---

## middleware/ (1 file)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `civilization-kernel.js` | .js | JS | Civilization kernel middleware — applied routes unknown | Unknown |

---

## services/ (21 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Services entry point | Production |
| `init.js` | .js | JS | Services initialisation | Production |
| `notion/index.js` | .js | JS | Notion service entry | Production |
| `notion/notion-client.js` | .js | JS | Notion API client | Production |
| `notion/notion-clients.js` | .js | JS | Multiple Notion client management | Production |
| `notion/notion-projects.js` | .js | JS | Notion project sync | Production |
| `notion/notion-sync.js` | .js | JS | Notion data synchronisation | Production |
| `notion/notion-tasks.js` | .js | JS | Notion task management | Production |
| `pipelines/index.js` | .js | JS | Pipelines entry | Production |
| `pipelines/agent-pipeline-hooks.js` | .js | JS | Agent pipeline hooks (duplicate of agent-system/agent-pipeline-hooks.js) | Duplicate |
| `pipelines/daily-briefing-pipeline.js` | .js | JS | Daily briefing pipeline | Production |
| `pipelines/lead-pipeline.js` | .js | JS | Lead management pipeline | Production |
| `pipelines/weekly-review-pipeline.js` | .js | JS | Weekly review pipeline | Production |
| `slack/index.js` | .js | JS | Slack service entry | Production |
| `slack/slack-agents.js` | .js | JS | Agent-to-Slack integration | Production |
| `slack/slack-alerts.js` | .js | JS | Slack alert delivery | Production |
| `slack/slack-briefings.js` | .js | JS | Briefing delivery to Slack | Production |
| `slack/slack-client.js` | .js | JS | Slack API client | Production |
| `slack/slack-system-health.js` | .js | JS | System health alerts to Slack | Production |
| `sync/index.js` | .js | JS | Sync services entry | Production |
| `sync/supabase-notion-sync.js` | .js | JS | Supabase ↔ Notion synchronisation | Production |

---

## migrations/ (55+ SQL files)

| Range | Files | Purpose | Status |
|-------|-------|---------|--------|
| 001–009 | 9 files | Core tables, governance, forensics, memory architecture | Applied |
| 010–019 | 10 files | Intelligence, cognitive, civilization, founder OS | Applied |
| 020–029 | 10 files | Strategic intelligence, empire, outbox, holdout scenarios | Applied |
| 030–039 | 10 files | Improvement registry, goals, kernel identity, seed data | Applied |
| 040–049 | 10 files (skips 044, 047) | Domain agents, entities, relationships, PWA | Applied |
| 050–054 | 5 files | Roadmap tables, executive roles, civilization cycle, cron log, routing | Applied |
| `028b_policy_schema_fix.sql` | 1 | Policy schema fix (interim) | Applied |
| `014_intentional_gap.sql` | 1 | Intentional gap marker | Applied |
| `032_intentional_gap.sql` | 1 | Intentional gap marker | Applied |
| `apex-eval-holdout-rotation.sql` | 1 | Holdout evaluation rotation | Applied |
| `README.md` | 1 | Migration documentation | Production |
| `seed-founder-profile.js` | 1 | Seeds founder profile data | Production |
| `supabase/functions/holdout-oracle/index.ts` | 1 | Holdout oracle Supabase Edge Function | Production |

---

## scripts/ (50+ files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `certify.js` | .js | JS | Build certification check | Production |
| `instrument.js` | .js | JS | OpenTelemetry instrumentation (original) | Production |
| `phase-a-verify.js` | .js | JS | Phase A backup + reconcile verification | Production |
| `phase-c-run.js` | .js | JS | Phase C test run | Production |
| `verify-c06.js` | .js | JS | Verify C06 acceptance criterion | Production |
| `verify-memory-integrity.js` | .js | JS | Memory integrity verification | Production |
| `reflection_agent.js` | .js | JS | Reflection agent (duplicate of agent-system/reflection_agent.js) | Duplicate |
| `gen-vapid.js` | .js | JS | Generate VAPID keys for PWA push | Production |
| `get_gmail_token.js` | .js | JS | OAuth token for Gmail | Production |
| `dump-stack.js` | .js | JS | Stack dump utility | Dev |
| `list_models.js` | .js | JS | List available Claude models | Dev |
| `measure-memory-health.js` | .js | JS | Memory health measurement | Dev |
| `run-all-migrations.js` | .js | JS | Run all SQL migrations | Production |
| `run-migrations.js` | .js | JS | Run individual migrations | Production |
| `run-pipeline.js` | .js | JS | Manual pipeline trigger | Dev |
| `run-c07-http.js` | .js | JS | Run C07 HTTP test | Validation |
| `run-c08-http.js` | .js | JS | Run C08 HTTP test | Validation |
| `runtime-trace.js` | .js | JS | Runtime execution tracing | Dev |
| `session-bridge.js` | .js | JS | Session bridging utility | Production |
| `shadow-pipeline-run.js` | .js | JS | Run shadow pipeline | Dev |
| `smoke-test.js` | .js | JS | Quick smoke test | Validation |
| `test-chat.js` | .js | JS | Chat endpoint test | Validation |
| `test-civilization.js` | .js | JS | Civilization cycle test | Validation |
| `test-cognitive-loop.js` | .js | JS | Cognitive loop test | Validation |
| `test-db-queries.js` | .js | JS | Database query test | Validation |
| `test-executive.js` | .js | JS | Executive council test | Validation |
| `test-gateway-context.js` | .js | JS | Gateway context test | Validation |
| `test-memory-layers.js` | .js | JS | Memory layer test | Validation |
| `test-triggers.js` | .js | JS | Trigger test | Validation |
| `transform-csp.js` | .js | JS | CSP header transformation | Production |
| `tunnel-watcher.js` | .js | JS | Obsidian tunnel watcher | Production |
| `watcher.js` | .js | JS | General file watcher | Dev |
| `ws3-child.js` | .js | JS | WebSocket child process | Production |
| `obsidian-tunnel.ps1` | .ps1 | PowerShell | Obsidian tunnel setup | Production |
| `obsidian-tunnel-permanent.ps1` | .ps1 | PowerShell | Permanent tunnel configuration | Production |
| `obsidian-tunnel-setup.ps1` | .ps1 | PowerShell | Tunnel initial setup | Production |
| `setup-autostart.bat` | .bat | Batch | Windows autostart setup | Production |
| `remove-autostart.bat` | .bat | Batch | Windows autostart removal | Production |
| `start-apex.bat` | .bat | Batch | Start APEX locally | Production |
| `stop-apex.bat` | .bat | Batch | Stop APEX locally | Production |
| `update-apex.bat` | .bat | Batch | Update APEX | Production |
| `proof/01-tables.js` through `proof/12-cron-and-skill.js` | .js | JS | 12 proof scripts for acceptance criteria | Production |

---

## tests/ (10 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `phase0-acceptance.test.js` | .js | JS | Phase 0 acceptance — 10/10 green | Production |
| `runtime-integration.test.js` | .js | JS | Runtime integration tests | Production |
| `ws-auth.test.js` | .js | JS | WebSocket authentication tests | Production |
| `canonical-json.test.js` | .js | JS | Canonical JSON tests | Production |
| `evidence-hash-integrity.test.js` | .js | JS | Evidence hash integrity tests | Production |
| `r-0-5-routing-table.test.js` | .js | JS | R-0-5 routing table test | Production |
| `r-0-6-simulation-trigger.test.js` | .js | JS | R-0-6 simulation trigger test | Production |
| `r-1-a-governance-evidence.test.js` | .js | JS | R-1-A governance evidence test | Production |
| `r-1-b-trace-propagation.test.js` | .js | JS | R-1-B trace propagation test | Production |
| `r-1-c-orchestrator-trace.test.js` | .js | JS | R-1-C orchestrator trace test | Production |

---

## validation/ (39 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `README.md` | .md | Markdown | Validation documentation | Production |
| `phase-a-verify.js` | .js | JS | Phase A verify (duplicate of scripts/phase-a-verify.js) | Duplicate |
| `phase-c-run.js` | .js | JS | Phase C run (duplicate of scripts/phase-c-run.js) | Duplicate |
| `verify-c06.js` | .js | JS | C06 verify (duplicate of scripts/verify-c06.js) | Duplicate |
| `verify-memory-integrity.js` | .js | JS | Memory integrity (duplicate of scripts/verify-memory-integrity.js) | Duplicate |
| `validate-phase10-cfo.js` through `validate-phase41.js` | .js | JS | 34 phase validation scripts (phases 10–41) | Production |

---

## public/ (7 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `dashboard.html` | .html | HTML | Primary dashboard UI (main interface) | Production |
| `apex-v2.css` | .css | CSS | Main dashboard stylesheet (57.1 KB) | Production |
| `apex-custom.css` | .css | CSS | Custom overrides (101 B) | Production |
| `editor.html` | .html | HTML | Editor UI | Production |
| `manifest.json` | .json | JSON | PWA manifest | Production |
| `sw.js` | .js | JS | Service worker (PWA) | Production |
| `apex-electron.js` | .js | JS | Electron app wrapper | Unknown |

---

## sidecar/ (3 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `main.py` | .py | Python | RAG sidecar — FastAPI/uvicorn service (duplicate of runtime/sidecar/main.py) | Duplicate |
| `requirements.txt` | .txt | Text | Python dependencies for sidecar | Production |
| `__init__.py` | .py | Python | Python package marker | Production |

---

## runtime/ (7 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `task-router.js` | .js | JS | Task routing — callers unknown | Unknown |
| `sidecar/main.py` | .py | Python | RAG sidecar active copy? — relationship to sidecar/main.py unknown | Unknown |
| `sidecar/requirements.txt` | .txt | Text | Python dependencies | Production |
| `synthetic/schedule.json` | .json | JSON | Synthetic test schedule | Production |
| `synthetic/reports/` (4 files) | .md | Markdown | SRE synthetic run reports (2026-06-17) | Generated |

---

## src/ (3 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `components/orb/PlasmaOrb.js` | .js | JS | Plasma orb visual component — no confirmed consumer | Unused |
| `routes/telemetry/index.js` | .js | JS | Telemetry API route — mount point unknown | Unknown |
| `workers/cron.js` | .js | JS | Web worker cron — relationship to lib/cron-scheduler.js unknown | Unknown |

---

## utils/ (1 file)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `math.js` | .js | JS | Math utilities — no consumers identified | Unused |

---

## supabase/ (6 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `functions/holdout-oracle/index.ts` | .ts | TypeScript | Holdout evaluation Supabase Edge Function | Production |
| `supabase-indexes.sql` | .sql | SQL | Additional database indexes | Production |
| `supabase-rls.sql` | .sql | SQL | Row-level security policies | Production |
| `supabase-task-tables.sql` | .sql | SQL | Task-related table definitions | Production |
| `.temp/cli-latest` | (none) | Text | Supabase CLI version cache | Generated |
| `.temp/linked-project.json` | .json | JSON | Linked Supabase project reference | Production |

---

## config/ (6 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `index.js` | .js | JS | Config module entry | Production |
| `cognition-weights.json` | .json | JSON | Cognitive weighting parameters | Production |
| `deploy-trigger.json` | .json | JSON | Render deploy trigger (config copy) | Production |
| `render-deploy-response.json` | .json | JSON | Cached Render API response | Generated |
| `render-env-response.json` | .json | JSON | Cached Render env API response | Generated |
| `render-env-vars.json` | .json | JSON | Render environment variable export | Generated |

---

## data/ (6 files)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `ai_pipeline.db` | .db | SQLite | AI pipeline database — schema unknown | Unknown |
| `ruvector.db` | .db | SQLite | Ruflo vector store — schema unknown | Unknown |
| `governance_events.jsonl` | .jsonl | JSONL | Governance event log — format unknown | Production |
| `memory.json` | .json | JSON | Memory state (canonical copy) | Production |
| `notifications.json` | .json | JSON | Notifications state (canonical copy) | Production |
| `timeline.json` | .json | JSON | Timeline state (canonical copy) | Production |

---

## dev-tools/ (30+ files across 4 subdirs)

| File/Dir | Ext | Lang | Purpose | Status |
|----------|-----|------|---------|--------|
| `ecosystem.config.js` | .js | JS | PM2 ecosystem configuration | Dev |
| `benchmarks/synthetic/benchmark-runs.json` | .json | JSON | Benchmark run results (duplicate of benchmarks/) | Generated |
| `shadow/shadow-adaptation.js` | .js | JS | Shadow mode adaptation analysis | Dev |
| `shadow/shadow-adaptation-effectiveness.js` | .js | JS | Shadow adaptation effectiveness | Dev |
| `shadow/shadow-apex-runs.js` | .js | JS | Shadow APEX run comparison | Dev |
| `shadow/shadow-evaluation.js` | .js | JS | Shadow evaluation framework | Dev |
| `shadow/shadow-ingest.js` | .js | JS | Shadow data ingestion | Dev |
| `shadow/shadow-memory-audit.js` | .js | JS | Shadow memory auditing | Dev |
| `shadow/shadow-metric-integrity.js` | .js | JS | Shadow metric integrity checks | Dev |
| `shadow/shadow-orchestration.js` | .js | JS | Shadow orchestration analysis | Dev |
| `shadow/shadow-reflection.js` | .js | JS | Shadow reflection analysis | Dev |
| `shadow/shadow-resilience.js` | .js | JS | Shadow resilience testing | Dev |
| `shadow/shadow-retrieval.js` | .js | JS | Shadow retrieval testing | Dev |
| `shadow/shadow-throughput.js` | .js | JS | Shadow throughput testing | Dev |
| `db/check-stages-table.js` | .js | JS | DB schema check utility | Dev |
| `db/fix-goal-schema.js` | .js | JS | Schema fix script | Dev |
| `db/migrate-apex-agent-stages.js` | .js | JS | Migration helper | Dev |
| `test-data-generator/cleanup.js` | .js | JS | Test data cleanup | Dev |
| `test-data-generator/cli.js` | .js | JS | Test data generator CLI | Dev |
| `test-data-generator/config.js` | .js | JS | Test data config | Dev |

---

## Hidden/Config Directories

### `.claude/`

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `CLAUDE.md` | .md | Markdown | Skill trigger documentation | Production |
| `memory.db` | .db | SQLite | Claude Code memory store | Production |
| `settings.json` | .json | JSON | Claude Code settings | Production |
| `settings.local.json` | .json | JSON | Local Claude Code settings | Production |
| `agents/` (80+ files) | .md | Markdown | Claude Code agent definitions | Production |
| `commands/` (20+ files) | .md | Markdown | Claude Code command definitions | Production |
| `helpers/` | various | various | Helper scripts and docs | Production |
| `skills/` (8 skill docs) | .md | Markdown | Skill documentation | Production |

### `.claude-flow/`

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `CAPABILITIES.md` | .md | Markdown | Claude-flow capabilities | Production |
| `config.yaml` | .yaml | YAML | Claude-flow configuration | Production |
| `daemon.pid` | .pid | Text | Daemon process ID | Generated |
| `daemon-state.json` | .json | JSON | Daemon state | Generated |
| `.gitignore` | (none) | Plaintext | Git exclusions | Production |

### `.swarm/`

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `memory.db` | .db | SQLite | Swarm hybrid vector+SQLite memory | Production |
| `memory.db-shm` | .db-shm | Binary | SQLite shared memory | Generated |
| `memory.db-wal` | .db-wal | Binary | SQLite write-ahead log | Generated |
| `schema.sql` | .sql | SQL | Swarm database schema | Production |
| `state.json` | .json | JSON | Swarm runtime state | Generated |

### `.gitnexus/`

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `meta.json` | .json | JSON | GitNexus index metadata | Generated |
| `lbug` | (none) | Unknown | Unknown file type and purpose | Unknown |
| `.gitignore` | (none) | Plaintext | Git exclusions | Generated |

---

## graphify-out/ (4 files at root + wiki/ subdirectory)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `graph.json` | .json | JSON | Knowledge graph data | Generated |
| `manifest.json` | .json | JSON | Graphify manifest | Generated |
| `.graphify_analysis.json` | .json | JSON | Analysis metadata | Generated |
| `.graphify_semantic_marker` | (none) | Binary | Semantic indexing marker | Generated |
| `wiki/` | directory | Markdown | Generated wiki files (contents not enumerated) | Generated |

---

## benchmarks/ (1 file at root)

| File | Ext | Lang | Purpose | Status |
|------|-----|------|---------|--------|
| `synthetic/benchmark-runs.json` | .json | JSON | Synthetic benchmark run log | Generated |

---

## piper_server/ (TTS server — large binary asset directory)

| Item | Purpose | Status |
|------|---------|--------|
| `server.py` (compiled) | Python TTS server via Piper | Production |
| `piper/` | Binary voice model assets (dozens of voice files) | Production |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Production | Active, confirmed in use |
| Dev | Developer tooling only |
| Validation | Test/validation scripts |
| Generated | Auto-generated, not hand-edited |
| Duplicate | Exact or near-exact copy exists elsewhere |
| Unknown | Presence confirmed; purpose or consumers not confirmed |
| Unused | No consumers identified |

---

## File Count Summary by Directory

| Directory | Approx Files | Primary Language |
|-----------|-------------|-----------------|
| `lib/` | ~200+ | JavaScript |
| `agent-system/` | 44 | JavaScript |
| `routes/` | 42 | JavaScript |
| `validation/` | 39 | JavaScript |
| `scripts/` | 50+ | JavaScript/Shell |
| `migrations/` | 60+ | SQL |
| `services/` | 21 | JavaScript |
| `dev-tools/` | 30+ | JavaScript |
| `tests/` | 10 | JavaScript |
| `public/` | 7 | HTML/CSS/JS |
| `src/` | 3 | JavaScript |
| `sidecar/` | 3 | Python |
| `utils/` | 1 | JavaScript |
| `middleware/` | 1 | JavaScript |
| **Total (excl. node_modules/.git)** | **~1,739** | |
