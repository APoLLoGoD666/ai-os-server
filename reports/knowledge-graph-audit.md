# Phase 8 Knowledge Graph Audit
**APEX AI OS v6 — Session: 2026-06-05**
**Status: EXISTING GRAPH PRODUCTION_READY — No new infrastructure required**

---

## Executive Summary

APEX AI OS already possesses a fully operational knowledge graph: the Obsidian vault reconstructed on 2026-06-04 with 7,130 wikilinks, a complete Entity-Index, and four structural registries. This audit evaluates whether adding GraphRAG, Neo4j, or any competing graph technology would improve the system. The answer is no. The recommendation is to build on the existing Obsidian graph rather than replace or duplicate it.

---

## 1. Current Knowledge Graph State

### Vault Reconstruction — 2026-06-04

| Metric | Value |
|---|---|
| Wikilinks (edges) | 7,130 |
| Vault type | Obsidian (local markdown) |
| Index file | `Entity-Index.md` |
| Agent registry | `Agent-Registry.md` |
| System registry | `System-Registry.md` |
| SOP registry | `SOP-Registry.md` |
| Reconstruction date | 2026-06-04 |

This is not a stub graph. 7,130 wikilinks represents a mature, hand-curated knowledge structure where every connection was intentionally placed. This level of curation is more semantically precise than any auto-generated graph.

### Graph Traversal in Practice

The APEX system accesses the Obsidian graph via:
- `wiki-reader` tool: reads any vault file by name
- `obsidian-reader.js`: file resolution with 5s AbortController timeout
- BM25 RAG: indexes vault markdown, retrieves by query
- `alexContext`: seeds voice session with top vault context

---

## 2. Registries — Structure and Coverage

### Entity-Index.md

Central entity registry mapping all named concepts, people, projects, and systems to their vault locations. Acts as the graph's node directory.

### Agent-Registry.md

| Column | Content |
|---|---|
| Agent name | All 8 pipeline agents + 5 domain agents listed |
| Capabilities | Per-agent capability summary |
| Status | PRODUCTION_READY / EXPERIMENTAL |
| Links | Wikilinks to SOP, config, and session notes |

### System-Registry.md

Maps all external integrations (Slack, Notion, GitHub, Gemini, Supabase, etc.) to their implementation files, status, and known issues.

### SOP-Registry.md

Standard operating procedures for recurring tasks. Referenced by REFLECTOR agent when writing lessons. Provides procedural memory structure.

---

## 3. GraphRAG Evaluation

**Technology:** Microsoft GraphRAG — automated community detection + LLM-generated cluster summaries, enabling "global" queries across an entire document corpus.

### Comparison with Existing Obsidian Graph

| Dimension | GraphRAG | Obsidian Wikilinks |
|---|---|---|
| Edge creation | Automated (LLM extracts entities) | Manual (high precision) |
| Community detection | Leiden algorithm | Implicit via folder structure + MOCs |
| Global query capability | Strong — summarizes across all clusters | Moderate — requires BM25 or explicit traversal |
| Re-indexing cost | High — LLM calls on every vault change | None — wikilinks are updated by the user |
| Infrastructure | Requires graph DB + vector store + LLM pipeline | Zero — Obsidian is already running |
| False edges | Common (LLM hallucinates relationships) | Rare (human-placed links are intentional) |

### Verdict: Not Justified

GraphRAG's core value-add — discovering non-obvious relationships between documents — is already provided by 7,130 hand-placed wikilinks. Auto-generated edges would introduce noise. The indexing cost (LLM calls on a corpus this size) would be significant and recurring.

The one capability GraphRAG adds that Obsidian lacks is "global summarization" (e.g., "synthesize everything in my vault about project management"). This is low-frequency enough that a direct Haiku call with BM25-retrieved chunks achieves the same result at a fraction of the cost.

---

## 4. Neo4j Evaluation

**Technology:** Native graph database — optimized for multi-hop traversal queries (Cypher), property graphs, and relationship-centric analytics.

### Use Case Analysis

| Use Case | Needed by APEX? | Covered by Obsidian? |
|---|---|---|
| Find all entities connected to X | Rare | Yes — wikilink traversal |
| Multi-hop reasoning (A→B→C chains) | Rare | Partially — backlink view |
| Relationship-typed edges | Not currently | Partially — by folder convention |
| Real-time graph updates | Not needed | N/A |
| Analytics over graph topology | Not needed | N/A |

### Verdict: Not Justified

Neo4j requires JVM overhead, persistent heap allocation (minimum 512MB in practice), and Cypher query maintenance. For a single-user personal AI OS where graph traversal is ad hoc rather than programmatic, the operational cost is not recoverable. Obsidian's wikilink graph + backlinks covers all navigation requirements.

---

## 5. What APEX Already Has vs. What GraphRAG/Neo4j Add

```
Current APEX Knowledge Graph Stack:
├── Obsidian vault (7,130 wikilinks)
│   ├── Entity-Index.md          ← node directory
│   ├── Agent-Registry.md        ← agent topology
│   ├── System-Registry.md       ← integration map
│   ├── SOP-Registry.md          ← procedural memory
│   └── Lessons.md               ← learning accumulation
├── BM25 RAG (langchain-rag.js)  ← semantic search over vault
├── pgvector (Supabase)          ← embedding search
└── wiki-reader tool             ← direct node access

What GraphRAG adds:
└── Auto-generated community summaries (already covered by MOC notes)
    └── Global query synthesis (covered by BM25 + Haiku summarization)

What Neo4j adds:
└── Typed relationship queries (not currently needed)
    └── Multi-hop programmatic traversal (not currently needed)
```

---

## 6. Build-On-It Recommendations

Rather than replacing the Obsidian graph, the following incremental improvements would increase its value at near-zero cost:

| Improvement | Effort | Impact |
|---|---|---|
| Add `last_updated` frontmatter to all registry files | Low | Freshness tracking in BM25 |
| Create `Project-Registry.md` (mirrors Agent-Registry format) | Low | Complete registry coverage |
| REFLECTOR agent writes to Entity-Index on new entity discovery | Medium | Auto-growing node directory |
| Periodic wikilink validation (detect broken links) | Medium | Graph integrity |

---

## 7. Conclusion

APEX AI OS does not need a new knowledge graph technology. It needs to use the one it already has more effectively. The 7,130-wikilink Obsidian vault, reconstructed on 2026-06-04, is the most semantically precise knowledge graph possible for this system because every edge was placed with intent. Automated graph tools would dilute that precision.

**Recommendation: Maintain Obsidian as the graph layer. Invest in tooling that reads and extends it (REFLECTOR writes, wiki-reader reads, BM25 searches) rather than replacing it.**
