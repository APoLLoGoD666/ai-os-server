# APEX AI OS — pgvector Readiness Audit

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 2

---

## Current State (Pre-Phase 28)

| Component | State | Location |
|-----------|-------|----------|
| pgvector extension | Enabled | server.js migration: `CREATE EXTENSION IF NOT EXISTS vector` |
| documents table | Has `vector(768)` column | server.js migration block |
| embedText() function | Exists | server.js (Voyage primary, Gemini fallback) |
| match_documents RPC | Exists in Supabase | server.js `supabase.rpc('match_documents', ...)` |
| Gemini text-embedding-004 | Available | GOOGLE_API_KEY in environment; 768-dim output |
| langchain-rag.js retrieval | BM25-only | No pgvector calls; local-only |

---

## Gap Analysis

**Core gap:** The pgvector infrastructure exists but is wired to the `documents` table (used for uploaded file indexing), not to the Obsidian vault. The `langchain-rag.js` RAG agent — which answers all vault queries — uses only local BM25 with no vector path.

**Secondary gap:** The Obsidian vault is a local filesystem path (`VAULT_PATH` env). On Render (production), the vault is not available as a local directory. This means:
- BM25 index built at runtime from local disk: works in dev, fails silently in prod
- A Supabase-backed vector store (`vault_embeddings`) solves the production availability problem

---

## Architecture for Hybrid Retrieval

```
Query
  │
  ├─► BM25 Retriever (local, always available)
  │     └─► scored by term frequency over loaded vault chunks
  │
  └─► pgvector Retriever (Supabase, available when SUPABASE_URL set)
        └─► embedQuery → match_vault_embeddings RPC → similarity scores
  │
  └─► Merge + Re-rank
        combined = 0.6 × (bm25_score / bm25_max) + 0.4 × vector_similarity
        └─► top-k results returned to LLM context
```

**Fallback behavior:** If `vault_embeddings` table is missing or `_vectorSearch()` throws, the system logs a warning and returns BM25-only results. No crash.

---

## Embedding Strategy

| Provider | Dimensions | Auth | Rate Limit | Cost | Role |
|----------|-----------|------|------------|------|------|
| Gemini text-embedding-004 | 768 | GOOGLE_API_KEY | 1,500 req/min free | $0 | Primary |
| Voyage AI (voyage-3-lite) | 1024 → truncated to 768 | VOYAGE_API_KEY | Per plan | Per token | Secondary (if key present) |

Gemini is the default for Phase 28 because GOOGLE_API_KEY is already in the environment and text-embedding-004 natively outputs 768-dim vectors matching the existing column type.

---

## Incremental Indexing

**Problem:** The vault has thousands of markdown files. Re-embedding everything on each 30-minute reindex is too slow and would exhaust free-tier rate limits.

**Solution:** FNV-1a hash of the first 300 characters of each chunk, stored in `vault_embeddings.chunk_hash`. On reindex:
1. Hash each chunk
2. Query `vault_embeddings` for `(source, chunk_hash)` pairs
3. Skip chunks where hash exists (unchanged content)
4. Embed and upsert only new/changed chunks

**Throttling:** 150ms pause per 10 embeddings to stay under Gemini free-tier limits (1,500 req/min sustained = ~25/sec; throttling keeps us at ~67/sec burst with pauses).

---

## Rollback Plan

1. Revert `agent-system/langchain-rag.js` to v6 version (BM25-only, ~50 lines removed)
2. The `vault_embeddings` table can remain in Supabase — it is read-only from the application perspective during normal operation
3. `lib/embed.js` can be deleted (no other files depend on it until further phases)
4. `match_vault_embeddings` RPC can be dropped from Supabase if desired

**Risk:** LOW. The only code path affected is `_vectorSearch()` in langchain-rag.js. The BM25 path is unchanged.

---

## Verdict

YES — hybrid retrieval can be implemented safely. pgvector infrastructure is in place, Gemini embeddings are available at no cost, and the BM25 fallback ensures zero downside if vector search degrades.
