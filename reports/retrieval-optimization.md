# Retrieval Optimization Report — Knowledge Evolution

Generated: 2026-06-06  Branch: feature/knowledge-evolution

## Hybrid Retrieval Pipeline (current)

```
retrieveContext(query)
  │
  ├─ BM25 (always available, in-memory)
  │    tokenize → score (term overlap × recency × source boost)
  │    → sort → source diversity → top k*3 candidates
  │
  ├─ Vector (Supabase pgvector, best-effort)
  │    embedText(query) → match_vault_embeddings RPC
  │    → top k*3 candidates (for diversity filtering)
  │
  └─ Merge (when vector available)
       BM25 normalised × 0.6 + vector similarity × 0.4
       → source diversity → top k
       → return {context, sources, confidence, method, latencyMs}
```

## Weights

| Signal | Weight | Rationale |
|---|---|---|
| BM25 term overlap | 0.6 | Fast, no API cost, good recall |
| Vector similarity | 0.4 | Semantic coverage, catches synonyms |
| Source boost (_SOURCE_BOOST) | ×1.15 | Lessons/Decisions/Projects > raw notes |
| Recency decay | 0.7–1.0 | Older files weighted down over 90 days |

## Latency Profile

| Path | Typical latency |
|---|---|
| BM25-only (no embed) | 5–50ms |
| Hybrid (Voyage primary) | ~200ms |
| Hybrid (Gemini fallback) | ~450ms |
| Vector search (Supabase RPC) | ~80–150ms |

## Bottlenecks

1. **Embed API latency**: Gemini ~425ms, Voyage ~180ms. Retrievals block on embed for each query.
   - Mitigation: embed cache (not yet implemented) — would eliminate repeat-query cost
2. **Full BM25 scan**: O(n) over all chunks. At 339 files / ~2000 chunks, ~5–20ms. Not an issue until 20k+ chunks.
3. **Supabase RPC cold start**: First call per session ~300ms extra. Subsequent calls cached by Supabase infra.

## Source Diversity Impact

With `MAX_PER_SOURCE = 2`:
- At k=4, results draw from minimum 2 different files
- Prevents "same file dominance" when one file scores highly on all chunks
- Trade-off: may exclude a highly-relevant third chunk from a dominant file

## Future Improvements (not yet implemented)

| Improvement | Expected gain | Complexity |
|---|---|---|
| Embed cache (LRU, query → vec) | -200ms on repeat queries | Low |
| MMR reranking (max marginal relevance) | Better diversity than hard cap | Medium |
| Query expansion (synonyms/acronyms) | Better BM25 recall | Medium |
| Cross-encoder reranker | Highest precision | High (model hosting) |
