# 08 — Knowledge System

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

---

## Knowledge System Components

The knowledge system exists in two layers: the **Obsidian vault** (human-readable markdown) and the **runtime code** (JavaScript knowledge engines).

---

## Vault Knowledge Layer (`09 Knowledge/`)

### CS249R Course Notes

AI systems and machine learning curriculum notes, organized in two volumes.

**Location:** `APEX AI OS/09 Knowledge/CS249R/`

**Volume 1 (`vol1/` — 15 notes):**
| File | Topic |
|------|-------|
| `benchmarking.md` | Benchmarking |
| `data_engineering.md` | Data engineering |
| `data_selection.md` | Data selection |
| `frameworks.md` | ML frameworks |
| `hw_acceleration.md` | Hardware acceleration |
| `introduction.md` | Introduction |
| `ml_ops.md` | MLOps |
| `ml_systems.md` | ML systems |
| `ml_workflow.md` | ML workflow |
| `model_compression.md` | Model compression |
| `model_serving.md` | Model serving |
| `nn_architectures.md` | Neural network architectures |
| `nn_computation.md` | Neural network computation |
| `responsible_engr.md` | Responsible engineering |
| `training.md` | Training |

**Volume 2 (`vol2/` — 15 notes):**
| File | Topic |
|------|-------|
| `collective_communication.md` | Collective communication |
| `compute_infrastructure.md` | Compute infrastructure |
| `data_storage.md` | Data storage |
| `distributed_training.md` | Distributed training |
| `edge_intelligence.md` | Edge intelligence |
| `fault_tolerance.md` | Fault tolerance |
| `fleet_orchestration.md` | Fleet orchestration |
| `inference.md` | Inference |
| `network_fabrics.md` | Network fabrics |
| `ops_scale.md` | Operations at scale |
| `performance_engineering.md` | Performance engineering |
| `responsible_ai.md` | Responsible AI |
| `robust_ai.md` | Robust AI |
| `security_privacy.md` | Security and privacy |
| `sustainable_ai.md` | Sustainable AI |

**Reader:** `agent-system/cs249r-reader.js`

### MOCs (Maps of Content)

**Location:** `09 Knowledge/MOCs/`

| MOC | File |
|-----|------|
| Agent MOC | `Agent-MOC.md` |
| Business MOC | `Business-MOC.md` |
| Finance MOC | `Finance-MOC.md` |
| Health MOC | `Health-MOC.md` |
| Knowledge MOC | `Knowledge-MOC.md` |
| Memory MOC | `Memory-MOC.md` |
| Operations MOC | `Operations-MOC.md` |
| Project MOC | `Project-MOC.md` |
| Relationships MOC | `Relationships-MOC.md` |
| System MOC | `System-MOC.md` |
| INDEX | `INDEX.md` |

### Entities

**Location:** `09 Knowledge/Entities/`

| File | Purpose |
|------|---------|
| `Entity-Index.md` | Master entity index |

**Runtime entity system:** `lib/entities/resolver.js`, `lib/entities/relationship-consumer.js`  
**Route:** `routes/entities.js`  
**Migration:** `042_entity_registry.sql`

### Research

**Location:** `09 Knowledge/Research/`

| File | Date |
|------|------|
| `2026-06-06.md` | 2026-06-06 |

---

## Runtime Knowledge Engines

### Knowledge Graph

| Component | Location |
|-----------|----------|
| Knowledge graph memory | `lib/memory/knowledge-graph.js` |
| Knowledge graph route | `routes/knowledge-graph.js` |
| Founder graph | `lib/founder/graph.js`, `lib/founder/graph-data.js` |
| Founder graph route | `routes/founder-graph.js` |
| Empire graph | `lib/empire/graph.js`, `lib/empire/graph-data.js` |
| Empire route | `routes/empire.js` |
| Migration | `019_founder_knowledge_graph.sql` |
| Migration | `021_empire_graph.sql` |

**Vault knowledge graph spec:** `00 Foundation/Cognitive Runtime/apex-runtime-architecture.md`

### Knowledge Validator

| Component | Location |
|-----------|----------|
| Knowledge validator | `lib/intelligence/knowledge-validator.js` |
| Proof script | `scripts/proof/05-knowledge-validator.js` |

### Context Assembly Engine

| Component | Location |
|-----------|----------|
| Spec | `00 Foundation/Memory OS/context-assembly-engine.md` |
| Implementation spec | `00 Foundation/Cognitive Runtime/context-assembly-engine-implementation.md` |
| Runtime | `lib/intelligence/context-composer.js` |

### Intelligence Layer (`lib/intelligence/`)

| File | Purpose |
|------|---------|
| `civilization-health-engine.js` | Civilisation health scoring |
| `civilization-runtime.js` | Civilization runtime state |
| `context-composer.js` | Context assembly |
| `contradiction-engine.js` | Contradiction detection |
| `decision-intelligence.js` | Decision support |
| `decision-outcome-engine.js` | Outcome tracking |
| `digital-twin-engine.js` | Digital twin |
| `executive-performance-engine.js` | Executive KPIs |
| `global-intelligence-engine.js` | Global intelligence |
| `graph-reasoning-engine.js` | Graph reasoning |
| `improvement-governor.js` | Improvement governance |
| `index.js` | Module entry |
| `knowledge-validator.js` | Knowledge validation |
| `memory-lifecycle-engine.js` | Memory lifecycle |
| `memory-retrieval-engine.js` | Memory retrieval |
| `opportunity-engine.js` | Opportunity identification |
| `organizational-learning-engine.js` | Org learning |
| `planning-influence-engine.js` | Planning influence |
| `reality-loop.js` | Reality loop |
| `resource-authority-engine.js` | Resource authority |
| `sie.js` | Strategic intelligence engine |
| `skill-evolution-engine.js` | Skill evolution |
| `strategy-engine.js` | Strategy engine |
| `value-creation-engine.js` | Value creation |

---

## SOPs (Standard Operating Procedures) (`10 SOPs/`)

### Agency Playbooks (`10 SOPs/Agency-Playbooks/`)

22 files covering the agency service methodology:

| Document | Purpose |
|----------|---------|
| `README.md` | Agency playbook overview |
| `QUICKSTART.md` | Quick start guide |
| `INDEX.md` | Playbook index |
| `EXECUTIVE-BRIEF.md` | Executive brief |
| `agent-activation-prompts.md` | Agent activation prompts |
| `handoff-templates.md` | Client handoff templates |
| `phase-0-discovery.md` through `phase-6-operate.md` | 7-phase agency delivery methodology |
| `nexus-spatial-discovery.md` | Nexus spatial discovery SOP |
| `nexus-strategy.md` | Nexus strategy SOP |
| `scenario-enterprise-feature.md` | Enterprise feature scenario |
| `scenario-incident-response.md` | Incident response scenario |
| `scenario-marketing-campaign.md` | Marketing campaign scenario |
| `scenario-startup-mvp.md` | Startup MVP scenario |
| `workflow-book-chapter.md` | Book chapter workflow |
| `workflow-landing-page.md` | Landing page workflow |
| `workflow-startup-mvp.md` | Startup MVP workflow |
| `workflow-with-memory.md` | Memory-enabled workflow |

### System SOPs

| Document | Purpose |
|----------|---------|
| `10 SOPs/System/Archive-Policy.md` | Archiving policy |
| `10 SOPs/System/Vault-Governance.md` | Vault governance rules |
| `10 SOPs/SOP-Registry.md` | SOP registry |
| `10 SOPs/SOP-Template.md` | Template for new SOPs |

### Domain SOPs

Business, Finance, Health, Personal, University SOP directories all exist but contain no files (empty).

---

## Graphify Knowledge Graph

**Location:** `graphify-out/` (also mirrored in `dev-tools/graphify-out/`)

A code intelligence knowledge graph built from AST analysis.

| Component | Location |
|-----------|----------|
| Analysis output | `graphify-out/.graphify_analysis.json` |
| Semantic marker | `graphify-out/.graphify_semantic_marker` |
| AST cache | `graphify-out/cache/ast/` (100+ JSON files) |
| Wiki | `graphify-out/wiki/` (UNKNOWN — not enumerated) |
| Skill | `.claude/skills/graphify/SKILL.md` |

Per CLAUDE.md: "Use it only when GitNexus MCP tools are unavailable."

---

## GitNexus Code Intelligence

**Index:** 3,614 symbols, 17,201 relationships, 300 execution flows  
**Registered as:** `ai-os-server`  
**MCP resource:** `gitnexus://repo/ai-os-server/`

| Resource | Purpose |
|----------|---------|
| `gitnexus://repo/ai-os-server/context` | Codebase overview |
| `gitnexus://repo/ai-os-server/clusters` | Functional areas |
| `gitnexus://repo/ai-os-server/processes` | Execution flows |
| `gitnexus://repo/ai-os-server/process/{name}` | Step-by-step trace |

---

## Briefings Knowledge (`13 Briefings/`)

Historical conversation notes and synthetic briefings:

| File | Date |
|------|------|
| `2026-05-21.md` | Real conversation |
| `2026-05-21-conversation.md` | Real conversation |
| `2026-05-22.md` | Real conversation |
| `2026-06-04.md` | Real conversation |
| `OfficeHours-Note.md` | Office hours note |
| `synth-2025-Q3.md` | Synthetic Q3 2025 brief |
| `synth-2025-Q4.md` | Synthetic Q4 2025 brief |
| `synth-2026-Q1.md` | Synthetic Q1 2026 brief |
| `synth-2026-Q2-early.md` | Synthetic Q2 early 2026 |
| `synth-2026-Q2-late.md` | Synthetic Q2 late 2026 |
| `AI Scripts/APEX AI OS/13 Briefings/Daily/2026-07-01.md` | Today's briefing (in AI Scripts) |
