# pgvector Integration — Knowledge Evolution

Generated: 2026-06-06  Branch: feature/knowledge-evolution

## Status: Operational (conditional on SUPABASE_URL)

## Schema

```sql
CREATE TABLE vault_embeddings (
    id         BIGSERIAL PRIMARY KEY,
    source     TEXT NOT NULL,
    chunk_hash TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding  vector(768),
    mtime      BIGINT,
    UNIQUE(source, chunk_hash)
);
CREATE INDEX ON vault_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

## RPC

```sql
CREATE OR REPLACE FUNCTION match_vault_embeddings(
    query_embedding vector(768),
    match_count     INT DEFAULT 4
)
RETURNS TABLE(source TEXT, chunk_text TEXT, similarity FLOAT)
LANGUAGE sql STABLE AS $$
    SELECT source, chunk_text,
           1 - (embedding <=> query_embedding) AS similarity
    FROM vault_embeddings
    ORDER BY embedding <=> query_embedding
    LIMIT match_count;
$$;
```

## Embedding Provider

- **Primary:** Voyage AI `voyage-3-lite` (1024-dim) when `VOYAGE_API_KEY` set
- **Secondary:** Google `gemini-embedding-001` with `outputDimensionality: 768` when `GOOGLE_API_KEY` set
- **Dimension:** 768 — matches vault_embeddings schema

## Embed Flow (langchain-rag.js)

1. `_buildIndex()` walks vault, creates chunks, builds BM25 in-memory index
2. `_embedNewChunks()` runs background; fetches existing `(source, chunk_hash, mtime)` from Supabase
3. Chunks skipped if hash already present AND mtime unchanged (stale detection)
4. Throttled: 150ms pause every 10 chunks (Gemini free-tier rate limit)
5. `_vectorSearch()` calls `match_vault_embeddings` RPC via JS client

## Render Constraint

`vault_embeddings` table must exist in Supabase. Created via:
```sql
-- Run via Supabase SQL editor or DATABASE_URL psql (not via Supabase JS client)
```

The JS client cannot run DDL. Table creation is a one-time manual step in the Supabase dashboard.

## Verification

```bash
# Confirms embed model works
GOOGLE_API_KEY=<key> node -e "
const { embedText } = require('./lib/embed');
embedText('test').then(v => console.log('dims:', v?.length, 'ok:', v?.length === 768));
"
# Expected: dims: 768 ok: true
```
