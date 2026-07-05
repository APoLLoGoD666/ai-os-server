# 05 — Memory Relationships

**Date:** 2026-07-02  
**Evidence Source:** lib/memory/gateway.js, lib/memory/index.js, routes/memory.js, routes/knowledge-graph.js, agent-system/orchestrator.js, middleware/civilization-kernel.js

---

## Memory Architecture Overview

```
All memory access flows through lib/memory/gateway.js
No model, agent, or pipeline component reads memory directly.
```

---

## lib/memory/gateway.js

**Location:** `lib/memory/gateway.js`

**Imports:**
- `./index` (mem — all 13 layers)
- `./access-controller` (AccessController)
- `./sanitizer` (sanitizer)
- `./cache` (cache)
- `./founder-memory` (founderMemory — FALLBACK_CONTEXT)
- `../clients` (getSupabaseClient)
- `../logger` (logger)
- `../health/monitor` (healthMonitor)

**Lazy internal requires:**
- `../intelligence/sie` (Strategic Intelligence Engine — in `_getSIEBriefing`)
- `./working-memory` (in lesson-to-task linkage)
- `./reflexion-tracker` (in reflexion tracking on getContext)
- `../consumption-log` (in getContext)

**Exports:**
```javascript
module.exports = {
  getContext,
  searchMemory,
  storeMemory,
  retrievePolicies,
  retrieveLessons,
  retrieveFounderContext,
  summarizeMemory,
  verifyEpisode,
}
```

**getContext() — layers queried simultaneously via Promise.allSettled:**
- Layer 0: `_getFounderContext` (founder-memory module + access-controller check)
- Layer 1: `_getLessons` (apex_lessons table)
- Layer 2: `_getPolicies` (constraints/cognitive policies)
- Layer 3: `_getHistorical` (historical context)
- Layer 5: `_getProjectContext` (active project / goals)
- Layer 6: `_getSemanticFacts` (semanticMemory.search)
- Layer 7: `_getWorkingMemory` (working_memory table)
- Layer 8: `_getSkillSummary` (skill memory)
- Layer 9: `_getKnowledgeNodes` (knowledge graph)
- `_getSIEBriefing` (Strategic Intelligence Engine — lazy)
- `_getExecutiveVerdicts` (executive_verdicts table)

**searchMemory() — layers supported:**
- Layer 1: working_memory table (ilike query)
- Layer 2: episodicMemory.findSimilar()
- Layer 3: proceduralMemory.findProcedure()
- Layer 5: strategic_memory table (ilike on title)
- Layer 6: proceduralMemory.findProcedure()
- Layer 7: decisionMemory.findSimilar()
- Layer 9: semanticMemory.search()
- Layer 10: apex_lessons table (textSearch → ilike fallback)

**Cache:** 60-second TTL on getContext results (lib/memory/cache)

**Access control:** AccessController.check(entity, layers, 'READ') gates layer access by requesting entity class

**Reflexion side-effect:** On every getContext, retrieved lessons are passed to reflexionTracker.recordRetrieval() via setImmediate

**Lesson-task linkage:** On every getContext with taskId + lessons, lesson IDs are stored in working_memory keyed by taskId (TTL 7200s)

**verifyEpisode() storage:** Queries `episodic_memory` table by task_id

---

## Confirmed Consumers of gateway.js

**Production runtime consumers (39 total):**

| File | Usage |
|------|-------|
| agent-system/orchestrator.js | `_gateway` — context for agent execution |
| server.js | Direct gateway use in chat handler |
| routes/voice-chat.js | Memory context for voice sessions |
| lib/certification/checker.js | Memory verification in cert checks |
| lib/executive/entity.js | Executive entity memory access |
| lib/intelligence/opportunity-engine.js | Opportunity context retrieval |
| lib/intelligence/digital-twin-engine.js | Twin model memory access |
| lib/chat-context.js | Chat session context assembly |
| lib/intelligence/civilization-runtime.js | Civilization cycle context |
| routes/communications.js | Communication history access |
| agent-system/obsidian-memory.js | Vault ↔ gateway bridge |
| lib/agent-task-cycle.js | Task planning context |
| lib/apex-tools.js | Tool invocation context |
| middleware/civilization-kernel.js | Per-request context check |
| lib/intelligence/strategy-engine.js | Strategic context assembly |
| lib/executive/domain-memory.js | Domain-specific executive memory |
| lib/intelligence/reality-loop.js | Reality assessment context |
| lib/founder/state-tracker.js | Founder state tracking |
| lib/intelligence/decision-outcome-engine.js | Decision context |
| lib/models/feedback.js | Model feedback context |
| scripts/* | Test and verification scripts |
| validation/* | Phase validation scripts |

---

## lib/memory/index.js — 13 Layer Barrel Export

```javascript
module.exports = {
  workingMemory:      require('./working-memory'),       // Layer 1
  episodicMemory:     require('./episodic-memory-pg'),   // Layer 2
  semanticMemory:     require('./semantic-memory'),      // Layer 3
  proceduralMemory:   require('./procedural-memory'),    // Layer 4
  strategicMemory:    require('./strategic-memory'),     // Layer 5
  skillMemory:        require('./skill-memory'),         // Layer 6
  decisionMemory:     require('./decision-memory'),      // Layer 7
  knowledgeGraph:     require('./knowledge-graph'),      // Layer 8
  consolidationEngine: require('./consolidation-engine'), // Layer 10
  reflexionTracker:   require('./reflexion-tracker'),    // Layer 11
  improvementEngine:  require('./improvement-engine'),   // Layer 12
  adaptationCycle:    require('./adaptation-cycle'),     // Layer 13
  governor:           require('./memory-governor'),      // Governance
}
```

**Note:** Layer 9 (knowledge-graph) is Layer 8 in exports above — numbering in gateway differs from index. Layer 10 in gateway = apex_lessons; consolidationEngine is the raw→reflections→lessons pipeline.

---

## Memory Layer Storage Backends

| Layer | Name | Storage Backend | Table/Key |
|-------|------|----------------|-----------|
| 0 | Founder Memory | module constant + Supabase | founder-memory.js FALLBACK_CONTEXT |
| 1 | Working Memory | Supabase | `working_memory` table |
| 2 | Episodic Memory | Supabase (durable) | `episodic_memory` table |
| 3 | Semantic Memory | Supabase (+ pgvector implied) | semanticMemory.search() |
| 4 | Procedural Memory | Supabase | proceduralMemory.findProcedure() |
| 5 | Strategic Memory | Supabase | `strategic_memory` table |
| 6 | Skill Memory | Supabase | skillMemory module |
| 7 | Decision Memory | Supabase | decisionMemory.findSimilar() |
| 8 | Knowledge Graph | Supabase | `knowledge_graph` table (inferred) |
| 10 | Lessons (Consolidation) | Supabase | `apex_lessons` table |
| — | Executive Verdicts | Supabase | `executive_verdicts` table |
| — | SIE Briefing | In-memory cache (6h TTL in SIE) | — |

---

## routes/memory.js

**Auth:** `router.use(require('../lib/app-auth'))` — ALL routes guarded

**Imports from lib/memory:**
- workingMemory, episodicMemory, semanticMemory, proceduralMemory, strategicMemory, skillMemory, decisionMemory, consolidationEngine, reflexionTracker, improvementEngine

**Endpoints exposed (confirmed from file):**
- `POST /memory/working` — store working memory item
- `GET /memory/working/:sessionId` — retrieve all session memory
- `GET /memory/working/:sessionId/:memoryType` — typed retrieval
- `DELETE /memory/working/:sessionId` — clear session
- `POST /memory/working/:sessionId/extend` — extend TTL
- `POST /memory/episodic` — store episode
- Additional endpoints for all imported layers (25+ total per comment in file)

**Consumed by:** Dashboard frontend, agent API clients

---

## routes/knowledge-graph.js

**Auth:** `router.use(require('../lib/app-auth'))`

**Import:** `lib/memory/knowledge-graph` (kg)

**Endpoints:**
- `POST /knowledge-graph/nodes` — create node (nodeType, label, properties, sourceMemoryId, sourceTable)
- `GET /knowledge-graph/nodes/:nodeId` — get node
- `GET /knowledge-graph/nodes/type/:nodeType` — get nodes by type (validates against kg.VALID_NODE_TYPES)
- `POST /knowledge-graph/edges` — create edge (fromNodeId, toNodeId, relationship, evidence, confidence)

---

## routes/intelligence-memory.js

**Location:** `routes/intelligence-memory.js` (auto-loaded)

**Purpose:** UNKNOWN — file exists in routes/ (confirmed in census). Internal imports not read.

---

## agent-system/episodic-memory.js

**Role:** Direct episodic write path (bypasses gateway)

**Consumers:** agent-system/orchestrator.js (static import as `_episodic`)

**Relationship to gateway:** Parallel path — agents write episodes directly through this module; gateway reads episodes through the Supabase client

---

## agent-system/memory-indexer.js

**Role:** Indexes agent output into memory layers after execution

**Consumers:** agent-system/orchestrator.js (static import as `_indexer`)

**Consumers of obsidian-memory:** orchestrator.js (static `memory`), routes/intelligence.js (direct require)

---

## Memory Access Hierarchy

```
Agent execution request
        │
        ▼
lib/memory/gateway.js (getContext)
        │
        ├── lib/memory/access-controller (entity + layer gate)
        │
        ├── lib/memory/cache (60s TTL)
        │
        ├── [Layer 0]  founder-memory.js (hardcoded founder context)
        ├── [Layer 1]  working-memory.js → Supabase working_memory
        ├── [Layer 2]  episodic-memory-pg.js → Supabase episodic_memory
        ├── [Layer 3]  semantic-memory.js → Supabase (pgvector)
        ├── [Layer 4]  procedural-memory.js → Supabase
        ├── [Layer 5]  strategic-memory.js → Supabase strategic_memory
        ├── [Layer 6]  skill-memory.js → Supabase
        ├── [Layer 7]  decision-memory.js → Supabase
        ├── [Layer 8]  knowledge-graph.js → Supabase knowledge_graph
        ├── [Layer 10] apex_lessons table (via Supabase JS)
        ├── [SIE]      lib/intelligence/sie.js (6h cached briefing)
        └── [Exec]     executive_verdicts table (last 3)
```

---

## Consolidation Pipeline

**Trigger:** lib/cron-scheduler.js `wiki_consolidation` cron job

**Chain:** raw episodes → reflections → lessons → patterns → knowledge graph nodes

**Stores:** apex_lessons (lessons), knowledge_graph (patterns → nodes)

**lib/memory/memory-governor.js:** Governance/quota enforcement over memory writes (exact internals UNKNOWN)

---

## Reflexion Cycle

**lib/memory/reflexion-tracker.js** (also: agent-system/reflexion-tracker.js — possible duplicate, see 14-Unknown-Relationships.md)

**Write path:** gateway.getContext() → reflexionTracker.recordRetrieval() [setImmediate]

**Read path:** agent-system/orchestrator.js → _reflexionTracker (static import at `../lib/memory/reflexion-tracker`)

**Consumers:**
- agent-system/orchestrator.js
- lib/memory/gateway.js (lazy require in getContext)

---

## Memory Write Paths (Summary)

| Writer | Method | Layer |
|--------|--------|-------|
| agent-system/orchestrator.js | _episodic.storeEpisode() | 2 |
| agent-system/memory-indexer.js | indexes agent output | 3+ |
| agent-system/adaptation-engine.js | adaptation updates | 13 |
| lib/cron-scheduler.js | wiki_consolidation | 10 |
| routes/memory.js | REST API endpoints | 1,2,3,4,5,6,7 |
| lib/memory/gateway.js | storeMemory() | all layers |
| agent-system/episodic-memory.js | direct episodic write | 2 |
