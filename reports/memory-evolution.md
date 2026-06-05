# Phase 7 Memory Evolution Audit
**APEX AI OS v6 — Session: 2026-06-05**
**Baseline Score: 86/100 | Score Impact: +0.5 Knowledge**

---

## Executive Summary

This audit evaluates every major memory/retrieval technology considered for APEX AI OS v6 and documents the rationale for keeping or rejecting each. The net outcome is a focused improvement to BM25 scoring (recency weighting + source type boost) and a confirmation that the existing LangChain memory pipeline is sufficient for all current use cases.

---

## 1. BM25 RAG — Current State and Improvement

### Before This Session

The BM25 retrieval pipeline in `agent-system/langchain-rag.js` used raw BM25 scores with no temporal awareness. A 2-year-old briefing competed equally with a briefing written yesterday. Source type (Lessons, Decisions, Projects) had no weighting.

### Improvement Implemented

| Component | Change | File |
|---|---|---|
| Recency weighting | `decay = max(0.7, 1.0 - (age_days / 90) * 0.3)` — score degrades from 1.0 to 0.7 over 90 days | `agent-system/langchain-rag.js` |
| Source type boost | `1.15×` multiplier for Lessons, Briefings, Decisions, Projects, Executive directories | `agent-system/langchain-rag.js` |
| mtime capture | File modification time captured per chunk during indexing | `agent-system/langchain-rag.js` |

### Effect

Queries about recent context now surface vault entries written in the last 30 days at a meaningful advantage over older entries without losing older content entirely (floor of 0.7×). Decision notes, lessons, and project files surface above generic notes in the same BM25 rank band.

---

## 2. LangChain Memory — Current State

| Property | Value |
|---|---|
| Window size | 20 messages |
| Summary model | Claude Haiku (cost-optimized) |
| Session persistence | `apex_lc_sessions` table in Supabase |
| Rolling summary trigger | When window fills |
| Implementation file | `agent-system/langchain-memory.js` |

**Verdict: Sufficient.** The 20-message window covers all realistic single-session exchanges. Rolling summaries prevent context window overflow. Episodic memory (what happened in past sessions) is covered by the `apex_lc_sessions` table — queries reconstruct prior context on session open via `alexContext`.

---

## 3. GraphRAG — Evaluation and Decision

**Technology:** Microsoft GraphRAG — builds a community-clustered knowledge graph from a document corpus, enabling "global" queries across the entire vault.

| Factor | Assessment |
|---|---|
| Vault size | 7,130 wikilinks already indexed; Obsidian graph provides equivalent community structure |
| Indexing cost | Full GraphRAG indexing on a 7,130-node vault would require hours of LLM calls and ongoing re-indexing |
| Incremental value | APEX queries are local (specific project/topic) not global ("summarize all my knowledge about X") |
| Infrastructure cost | Requires separate vector store + graph DB or heavy local setup |
| Single-user scale | Diminishing returns at this scale — GraphRAG designed for enterprise knowledge bases |

**Decision: Not justified.** The Obsidian wikilink graph is already a hand-curated knowledge graph. Adding an automated GraphRAG layer would duplicate structure that already exists, at significant compute cost, for marginal retrieval improvement on personal-scale queries.

---

## 4. Qdrant — Evaluation and Decision

**Technology:** Purpose-built vector database with payload filtering, HNSW indexing, and named collections.

| Factor | Assessment |
|---|---|
| Current vector store | pgvector in Supabase (`documents` table with `embedding` column) |
| Migration cost | Re-embed all chunks, update all retrieval paths, new infra to manage |
| Performance gain | Negligible at < 100K vectors (current scale) |
| Operational complexity | Additional service to monitor, back up, and maintain |
| pgvector capability | Sufficient for IVFFLAT index at current scale; slow queries now logged |

**Decision: Not justified.** Qdrant outperforms pgvector above ~1M vectors with high-QPS workloads. APEX AI OS does not approach this scale. Migration cost exceeds any latency gain, and the new slow query logging will surface any real bottlenecks.

---

## 5. Neo4j — Evaluation and Decision

**Technology:** Graph database for storing entity relationships, traversal queries, and multi-hop reasoning.

| Factor | Assessment |
|---|---|
| Use case fit | Relationship traversal (A → B → C) most useful in multi-user or enterprise contexts |
| Current coverage | Obsidian wikilinks provide a navigable relationship graph already |
| Single-user | One user, one AI OS — relationship queries are ad hoc, not programmatic |
| Operational overhead | Neo4j requires JVM, memory, and active management |
| Query patterns | APEX queries are semantic (BM25/vector), not graph-traversal |

**Decision: Not justified.** For a single-user personal AI OS, the Obsidian wikilink graph covers all relationship-navigation needs. Programmatic graph traversal would only add value if APEX needed to answer questions like "find all projects connected to entity X through 3 hops," which is not a current use case.

---

## 6. Mem0 — Evaluation and Decision

**Technology:** Memory layer from mem0ai — structured long-term memory with entity extraction and search.

| Factor | Assessment |
|---|---|
| External dependency | Requires mem0 cloud or self-hosted service |
| Overlap with current stack | LangChain memory + Obsidian vault covers all memory categories (episodic, semantic, procedural) |
| Entity extraction | Already handled by vault structure (Entity-Index.md, Agent-Registry, etc.) |
| Cost | Additional API call per interaction |
| Maturity | Relatively new, less battle-tested than LangChain |

**Decision: Not justified.** Mem0 solves a problem APEX already has a working solution for. The current stack (LangChain rolling summary + Obsidian structured vault + pgvector semantic search) covers long-term memory adequately.

---

## 7. Episodic Memory Coverage

Episodic memory — the ability to recall what happened in previous sessions — is handled by:

1. `langchain-memory.js` + `apex_lc_sessions` table: stores full session summaries and rolling context windows
2. Obsidian vault daily notes: capture significant decisions and events
3. `alexContext` construction at session open: pulls recent Supabase events + Obsidian context to seed the conversation

This covers the core requirement. Missing: explicit session-to-session "what did I learn last time about X" retrieval. That is addressed partially by recency weighting in BM25 but not by a dedicated episodic retrieval API.

---

## 8. Implemented Changes — Evidence

```
agent-system/langchain-rag.js:
  + recencyWeight(mtime): returns decay multiplier 0.7–1.0 based on file age
  + sourceBoost(filepath): returns 1.15 for priority directories, 1.0 otherwise
  + finalScore = bm25Score * recencyWeight * sourceBoost
```

Both functions are pure (no I/O), applied at retrieval time with no indexing cost. Re-indexing continues on the existing 30-minute cron cycle.

---

## 9. Score Impact

| Dimension | Before | After | Delta |
|---|---|---|---|
| Knowledge retrieval quality | Baseline | +recency + source boost | +0.5 |
| Infrastructure complexity | Clean | Clean (no new services added) | 0 |
| Operational risk | Low | Low | 0 |

**Net score contribution: +0.5 Knowledge**

---

## 10. Recommended Next Steps

1. Monitor BM25 retrieval quality over 2 weeks — check if Lessons/Decisions surface appropriately in pipeline runs
2. Consider adding per-query source-breakdown logging (which files contributed to top-5 hits) for debugging
3. Evaluate episodic retrieval endpoint if session-to-session recall becomes a pain point (low priority)
