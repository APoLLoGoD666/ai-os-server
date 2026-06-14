# APEX AI OS — pgvector Hybrid Retrieval Implementation

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 3

---

## Schema

### vault_embeddings table

```sql
CREATE TABLE IF NOT EXISTS vault_embeddings (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,          -- relative path within vault (e.g. "Projects/apex.md")
  chunk_hash  TEXT NOT NULL,          -- FNV-1a hash of first 300 chars of chunk
  chunk_text  TEXT NOT NULL,          -- full chunk content (up to ~1000 chars)
  embedding   vector(768),            -- Gemini text-embedding-004 output
  mtime       BIGINT,                 -- file modification time (epoch ms) for cache invalidation
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Deduplication: same source + same hash = same chunk, no re-embed
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_embeddings_source_hash
  ON vault_embeddings(source, chunk_hash);

-- Vector similarity search index (ivfflat for approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_vault_embeddings_vector
  ON vault_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);
```

**Note on lists=50:** Appropriate for up to ~50,000 chunks (rule of thumb: `sqrt(rows)`). Re-run `REINDEX` after significant growth.

### match_vault_embeddings RPC

```sql
CREATE OR REPLACE FUNCTION match_vault_embeddings(
  query_embedding vector(768),
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  source     text,
  chunk_text text,
  mtime      bigint,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    source,
    chunk_text,
    mtime,
    1 - (embedding <=> query_embedding) AS similarity
  FROM vault_embeddings
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Files Changed

### lib/embed.js (NEW)

Shared `embedText(text)` module extracted from server.js inline function. Used by both server.js (documents flow) and langchain-rag.js (vault flow).

- Voyage AI (voyage-3-lite) if `VOYAGE_API_KEY` present
- Gemini text-embedding-004 (768-dim) via `GOOGLE_API_KEY` as primary/fallback
- Returns `Float32Array` of length 768
- Throws with descriptive error if neither key is available

### agent-system/langchain-rag.js (MODIFIED)

Three new private methods added to the `LangChainRAG` class:

| Method | Purpose |
|--------|---------|
| `_vectorSearch(query, k)` | Embeds query → calls match_vault_embeddings RPC → returns top-k results with similarity scores |
| `_embedNewChunks(chunks)` | Filters out already-hashed chunks → batches embeddings with throttling → upserts to vault_embeddings |
| `_hash(text)` | FNV-1a hash of first 300 chars of chunk text for deduplication |

`retrieve()` method updated to run BM25 and vector search in parallel (`Promise.allSettled`) then merge:

```js
combined_score = 0.6 × (bm25_score / bm25_max) + 0.4 × vector_similarity
```

### server.js (MODIFIED)

- vault_embeddings table creation added to migration IIFE
- match_vault_embeddings RPC creation added to migration IIFE
- `embedText()` import updated to use `lib/embed.js` (de-duplicated)
- apex_agent_stages table creation added to migration IIFE (Phase 4 co-deployment)

---

## Ranking Formula Detail

```
For each candidate chunk:
  bm25_normalized  = bm25_score / max(all_bm25_scores)   # 0.0–1.0
  vector_sim       = 1 - cosine_distance                  # 0.0–1.0 from RPC

  combined = (0.6 × bm25_normalized) + (0.4 × vector_sim)
```

**Rationale for 60/40 split:**
- BM25 favors exact keyword matches; high precision for named entities (project names, people, tools)
- Vector similarity catches semantic equivalents ("auth errors" matches "login failures")
- 60% BM25 weight preserves reliability when GOOGLE_API_KEY is missing or rate-limited

---

## Deduplication Detail

```js
_hash(text) {
  // FNV-1a on first 300 chars
  let h = 2166136261;
  const sample = text.slice(0, 300);
  for (let i = 0; i < sample.length; i++) {
    h ^= sample.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16);
}
```

On each 30-minute reindex cycle, only chunks with new hashes are sent to Gemini. A typical vault of 500 files with 5 chunks each = 2,500 chunks. After initial indexing, incremental runs typically touch <50 chunks (only modified files).

---

## Throttling

```js
// In _embedNewChunks(), after every 10th embedding:
if (i > 0 && i % 10 === 0) {
  await new Promise(r => setTimeout(r, 150));
}
```

At 150ms per 10 embeddings: 2,500 initial chunks takes ~37.5 seconds total. Subsequent incremental runs are near-instant.

---

## Rollback

1. Revert `agent-system/langchain-rag.js` — remove `_vectorSearch`, `_embedNewChunks`, `_hash`; revert `retrieve()` to BM25-only
2. Delete `lib/embed.js` and restore inline `embedText()` to server.js
3. vault_embeddings table can remain (inert without the code)
4. match_vault_embeddings RPC can remain (inert)

**No data loss. No existing queries affected.**

---

## Expected Improvement

| Query Type | BM25 Only | Hybrid BM25+pgvector |
|------------|-----------|---------------------|
| "What is the APEX roadmap?" | Good (keyword match) | Good |
| "lessons about authentication failures" | Poor (keyword mismatch with "auth errors") | Good (semantic match) |
| "decisions made about the database" | Moderate | Good |
| "what did we conclude about performance?" | Poor | Good |
| Exact file name lookup | Excellent | Excellent |

Semantic queries — the ones most valuable to the orchestrator's RESEARCHER stage — are expected to improve significantly.
