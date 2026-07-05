# 06 — Knowledge Relationships

**Date:** 2026-07-02  
**Evidence Source:** lib/memory/knowledge-graph.js, routes/knowledge-graph.js, agent-system/obsidian-memory.js, agent-system/langchain-rag.js, render.yaml, lib/cron-scheduler.js, CLAUDE.md

---

## Knowledge Systems Overview

Four distinct knowledge systems operate in APEX:

1. **Obsidian Vault** — file-based knowledge store (Markdown notes)
2. **Knowledge Graph** — Supabase-backed graph of nodes and edges
3. **LangChain RAG** — vector similarity retrieval pipeline
4. **Python RAG Sidecar** — RAG-Anything pipeline (Render separate service)

---

## Obsidian Vault

### agent-system/obsidian-memory.js

**Role:** Bridge between the Obsidian vault (file system) and the runtime memory system

**Consumers:**
- agent-system/orchestrator.js (static `memory` — primary vault read/write)
- routes/intelligence.js (direct require)
- lib/cron-scheduler.js (vault health cron)
- lib/chat-context.js (chat context from vault)
- lib/cognitive/reporting/intelligence-evolution-reporter.js
- agent-system/self-evaluator.js
- lib/cognitive/runtime/cognitive-feedback-loop.js
- scripts/tunnel-watcher.js
- src/routes/telemetry/index.js
- agent-system/improvement-executor.js
- agent-system/reflection-engine.js
- agent-system/wiki-reader.js
- agent-system/memory-indexer.js
- agent-system/prompt-expander.js
- agent-system/agent-library.js
- agent-system/master-orchestrator.js
- routes/voice-chat.js
- server.js

**agent-system/obsidian-client.js** (lazy loaded in orchestrator.js at lines 276, 279 — vault write tasks)

**Vault path:** `APEX AI OS/` directory (Obsidian vault root — inferred from memory file)

**Vault consolidation:** lib/cron-scheduler.js `wiki_consolidation` job touches vault via obsidian-memory

---

## Knowledge Graph (Supabase-backed)

### lib/memory/knowledge-graph.js

**Exports:**
- `createNode(nodeType, label, properties, sourceMemoryId, sourceTable)` → nodeId
- `getNode(nodeId)` → node
- `getNodesByType(nodeType, limit)` → nodes[]
- `createEdge(fromNodeId, toNodeId, relationship, evidence, confidence)` → edgeId
- `VALID_NODE_TYPES` — validated node type enum

**Storage:** Supabase (inferred table: `knowledge_graph` or separate `kg_nodes`/`kg_edges`)

**Consumed by:**
- routes/knowledge-graph.js (REST CRUD)
- lib/memory/gateway.js (`_getKnowledgeNodes` in getContext)
- lib/memory/index.js (barrel export as `knowledgeGraph`)

### routes/knowledge-graph.js

**Auth:** app-auth (all routes guarded)

**Endpoints:**
- `POST /knowledge-graph/nodes`
- `GET /knowledge-graph/nodes/:nodeId`
- `GET /knowledge-graph/nodes/type/:nodeType`
- `POST /knowledge-graph/edges`

**Consumed by:** Dashboard, external API clients

---

## LangChain RAG Pipeline

### agent-system/langchain-rag.js

**Framework:** `@langchain/anthropic`, `@langchain/core`, `@langchain/community`, `langchain`

**Exports:** `retrieveContext` (confirmed from routes/intelligence.js consume pattern)

**Consumed by:** routes/intelligence.js (lazy: `rag`)

### routes/intelligence.js (RAG integration)

**RAG lazy load pattern:**
```javascript
// rag lazy factory — loaded on first call
let rag;
function getRag() { if (!rag) rag = require('../agent-system/langchain-rag'); return rag; }
```

**Vector storage:** UNKNOWN — likely Supabase pgvector (pg_database.js is used for pgvector operations) or external

---

## Python RAG Sidecar

### render.yaml — apex-ai-sidecar service

```yaml
- type: web
  name: apex-ai-sidecar
  env: python
  buildCommand: pip install -r sidecar/requirements.txt
  startCommand: uvicorn sidecar.main:app --host 0.0.0.0 --port $PORT
```

**Activation:** Requires `RAG_SIDECAR_URL` env var set on ai-os-server + `OPENAI_API_KEY` on sidecar service

**Integration note (from render.yaml comment):** "After deploy: set RAG_SIDECAR_URL on ai-os-server to this service's URL. RAG-Anything activates if OPENAI_API_KEY is also set on this service."

**Status:** UNKNOWN — whether RAG_SIDECAR_URL is configured in production

**File:** `sidecar/main.py` (Python application entry point)

---

## Graphify (Local Code Intelligence)

**Location:** `graphify-out/` directory

**Commands:** `graphify query`, `graphify path`, `graphify explain`, `graphify update`

**Purpose:** AST-based code knowledge graph (no API cost). Local developer tool.

**Consumed by:** Developer/Claude Code sessions only — NOT by server.js runtime

**Wiki:** `graphify-out/wiki/index.md`

---

## GitNexus (Remote Code Intelligence)

**Mode:** MCP server (`.mcp.json`)

**Index:** ai-os-server (3614 symbols, 17201 relationships, 300 execution flows)

**Tools:** gitnexus_impact, gitnexus_query, gitnexus_context, gitnexus_detect_changes, gitnexus_rename

**Consumed by:** Claude Code sessions only — NOT by server.js runtime

---

## lib/cron-scheduler.js — Knowledge Maintenance Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| wiki_consolidation | Weekly (inferred) | Vault health + consolidation |
| vault_health | Regular interval | Check vault integrity |
| adaptation_refresh | Weekly | Refresh adaptation patterns from knowledge |

---

## lib/memory/consolidation-engine.js

**Role:** Consolidation pipeline — raw episodes → reflections → lessons → patterns → knowledge graph nodes

**Consumed by:** lib/memory/index.js (barrel export as `consolidationEngine`)

**Storage writes:** `apex_lessons` table (lessons), knowledge-graph nodes (patterns)

**Note:** SEPARATE file from `lib/consolidation-engine.js` (at lib root) — the lib/consolidation-engine.js is imported by lib/integrity-crons.js. Status: two distinct files with possible overlap (see 14-Unknown-Relationships.md).

---

## agent-system/wiki-reader.js

**Role:** Reads from Obsidian vault wiki

**Consumers:** agent-system/obsidian-memory.js (inferred from consumer list grep)

**Internal imports:** UNKNOWN

---

## routes/intelligence.js — Knowledge Endpoints

**Imports:** obsidian-memory (static), langchain-rag (lazy)

**Knowledge endpoints (confirmed in file):**
- `GET /intelligence/lessons` — recent reflexion lessons
- Voice interrupt/status endpoints (intelligence pipeline, not knowledge-specific)
- RAG retrieval endpoints (lazy — exact paths UNKNOWN beyond `/intelligence/*` prefix)

---

## Strategic Intelligence Engine (SIE)

**Location:** lib/intelligence/sie.js

**Role:** Executive briefing synthesis from across all knowledge layers

**Consumed by:** lib/memory/gateway.js (lazy in `_getSIEBriefing`)

**Cache:** 6-hour TTL (internal to SIE module)

**Input:** All memory layers + knowledge graph + vault + strategic memory

**Output:** `generateExecutiveBriefing({ query })` — executive briefing object used in context assembly
