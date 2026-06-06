# Knowledge Baseline — Feature/Knowledge-Evolution

Generated: 2026-06-06  Branch: feature/knowledge-evolution

## Current Architecture

| Component | File | Status |
|---|---|---|
| RAG retrieval | agent-system/langchain-rag.js | Partially functional |
| Embedding | lib/embed.js | BROKEN (wrong model name) |
| Vault memory | agent-system/obsidian-memory.js | Functional (local only) |
| pgvector search | Supabase vault_embeddings | Table may not exist |

## Embedding Audit

**Problem:** `lib/embed.js` calls `text-embedding-004` which returns HTTP 404.
Google renamed the model. The current API has no model named `text-embedding-004`.

**Evidence:**
```
[embed] Gemini error: HTTP 404  (observed in local test, every single call)
[LCRAG] Vector index updated: 0 new chunks embedded
```

**Available models (discovered via API):**
- `gemini-embedding-001` — 3072 dims natively, supports `outputDimensionality: 768`
- `gemini-embedding-2` — 3072 dims natively
- No `text-embedding-004` exists

**Fix path:** `gemini-embedding-001` with `outputDimensionality: 768` maintains full compatibility with existing `vault_embeddings` schema (`vector(768)`).

## BM25 Retrieval Audit

**Status:** Functional when `OBSIDIAN_VAULT_PATH` resolves.
- Local: 339 .md files, vault at `C:\Users\arwwo\Desktop\AI Scripts\APEX AI OS`
- Render: path doesn't resolve → 0 chunks indexed → fallback returns empty string

**Scoring function issues found:**
1. Hash function only covers first 300 chars of text — hash collisions possible for chunks with identical openings
2. No source diversity — can return 4 chunks from same file, starving other sources
3. No confidence score surfaced to caller — callers get plain text, no quality signal
4. No retrieval diagnostics — callers can't tell if BM25 or hybrid was used

## Hybrid Retrieval Audit

**Current:** Implemented but broken because vector embed returns null (wrong model).
**Result:** Always falls back to BM25-only path silently.
**Weighting:** 60% BM25, 40% vector — correct once embedding is fixed.

## Vector Store Audit

**vault_embeddings table:** Likely does not exist in Supabase (requires pg direct connection via DATABASE_URL which is unconfigured on Render).
**Local:** Table created when server starts with DATABASE_URL set.

**Schema:**
```sql
vector(768), source TEXT, chunk_hash TEXT, chunk_text TEXT, mtime BIGINT
UNIQUE(source, chunk_hash)
IVFFlat index, 50 lists
```

## Lesson System Audit

**Current:** obsidian-memory.js writes to local disk only (`01 Executive/Lessons.md`).
**In-memory buffer:** Capped at 50 entries, lost on restart.
**Supabase persistence:** Not implemented. `apex_lessons` table referenced in server.js but does not exist.
**Searchability:** Not searchable — getRecentLessons() returns raw markdown, no semantic search.

## Knowledge Integrity Score (Baseline)

| Dimension | Score | Issue |
|---|---|---|
| Embedding availability | 0/10 | Wrong model — returns null 100% of calls |
| BM25 retrieval quality | 6/10 | Works locally, no source diversity, no confidence |
| Hybrid retrieval | 0/10 | Blocked by embedding failure |
| Lesson persistence | 4/10 | Local disk only, lost on Render |
| Vault coverage on Render | 0/10 | OBSIDIAN_VAULT_PATH not mapped |
| Confidence scoring | 0/10 | Not implemented |
| Stale detection | 0/10 | Not implemented |

**Overall: 1.4/10 → Target: 9.5/10**

## Implementation Order (by ROI)

1. Fix embed.js model name → unblocks all vector operations (+3.0)
2. Add source diversity + confidence scoring → +1.5
3. Fix hash collision → +0.5
4. Add retrieveContextWithMeta() → +0.5
5. Add apex_lessons schema + Supabase persistence → +1.5
6. Add getStats() diagnostics → +0.5
7. Add stale embedding detection → +1.0
8. Render disk path documentation → +0.5 (cross-domain)
