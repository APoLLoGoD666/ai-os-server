# Knowledge Quality Report — Knowledge Evolution

Generated: 2026-06-06  Branch: feature/knowledge-evolution

## Improvements Applied

### 1. Hash Collision Fix (langchain-rag.js:_hash)

**Before:** FNV-1a capped at first 300 characters
```js
for (let i = 0; i < Math.min(text.length, 300); i++) {
```

**After:** Full-text hash
```js
for (let i = 0; i < text.length; i++) {
```

**Impact:** Chunks with identical 300-char openings but different tails no longer collide. Affects deduplication accuracy in `vault_embeddings`.

### 2. Source Diversity (langchain-rag.js:_applySourceDiversity)

**Before:** Top-K could return 4 chunks from the same file.

**After:** `MAX_PER_SOURCE = 2` enforced on both BM25 and hybrid paths via `_applySourceDiversity()`. Over-fetches `k * 3` candidates, then caps per source before final slice.

**Impact:** Answers draw from more files. Relevant context from under-weighted sources surfaces.

### 3. Confidence Scoring (langchain-rag.js:retrieveContextWithMeta)

**Before:** Callers received plain text with no quality signal.

**After:** `retrieveContextWithMeta(query, k)` returns:
```js
{ context: string, sources: string[], confidence: number|null, method: 'bm25'|'hybrid'|'error', latencyMs: number }
```

`confidence` is the normalised score of the top result (0–1). A value below 0.2 indicates weak retrieval.

### 4. Stale Embedding Detection (langchain-rag.js:_embedNewChunks)

**Before:** Chunks were re-embedded only when hash was absent. Modified files were not re-embedded.

**After:** Fetches `(source, chunk_hash, mtime)` from Supabase. A chunk is re-embedded if its mtime exceeds the stored mtime — catches edited vault notes.

### 5. Retrieval Diagnostics (langchain-rag.js:getStats)

```js
getStats() → {
    totalRetrievals, hybridRetrievals, bm25Retrievals, embedErrors,
    chunksIndexed, chunksEmbedded, lastIndexedAt,
    chunksInMemory, indexAgeMs, vectorEnabled
}
```

Callers can use this to surface retrieval health in the dashboard.

## Quality Score Delta

| Dimension | Before | After |
|---|---|---|
| Hash collision | ❌ 300-char cap | ✅ Full-text |
| Source diversity | ❌ None | ✅ MAX_PER_SOURCE=2 |
| Confidence scoring | ❌ Not implemented | ✅ 0–1 normalised |
| Stale detection | ❌ Hash-only | ✅ Hash + mtime |
| Retrieval diagnostics | ❌ None | ✅ getStats() |
| Method transparency | ❌ Opaque | ✅ method field |
