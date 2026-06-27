# Phase 2: Knowledge Evolution — RAG System State

---

## Current Implementation

Hybrid BM25 + pgvector retrieval is already implemented in `langchain-rag.js`. This is not a planned feature — it is live code.

**Architecture:**

| Component | Technology | Config | Status on Render |
|---|---|---|---|
| BM25 (keyword) | In-process, file-based | `OBSIDIAN_VAULT_PATH` | Non-functional — path not available |
| Vector search | pgvector via Supabase | `vault_embeddings` table | Non-functional — table empty |
| Confidence scoring | Combined weighted score | BM25 × 0.6 + vector × 0.4 | Implemented, not exercised |
| Vault reachability | File system check | `OBSIDIAN_VAULT_PATH` | `vault_reachable: true` per self-check |

Note: `vault_reachable: true` alongside `vector_chunks: null` indicates the reachability check passes (possibly checking an env var exists rather than files being present), but no actual chunks have been indexed.

---

## Why RAG Is Non-Functional on Render

**BM25 path:** Requires markdown files at `OBSIDIAN_VAULT_PATH`. This is a Windows local path (e.g. `C:\Users\arwwo\Desktop\AI Scripts\APEX AI OS\`). That path does not exist on Render's Linux containers. BM25 index cannot be built.

**Vector path:** Requires `vault_embeddings` table in Supabase to be populated. Population requires reading vault files, which requires `OBSIDIAN_VAULT_PATH` to be accessible. No indexing job has run on Render, so the table is empty. `vector_chunks: null` confirms zero embeddings.

**Combined result:** Both retrieval paths return empty results. The RAG system returns `ok: true` because the code executes without errors — it just has no data to retrieve from.

---

## Confidence Scoring

The BM25 × 0.6 + vector × 0.4 weighting is already in place. This is the correct hybrid scoring approach. No changes to scoring logic are warranted. The weights can be tuned once real retrieval data is available.

---

## Recommendation: Vault Sync to Render Disk

**Approach:** Mount a Render persistent disk at `/data/vault` (1GB is sufficient for a typical Obsidian vault of markdown files). Copy or sync vault contents to this path at deploy time or via a scheduled sync job.

**Steps required:**
1. Add Render persistent disk (1GB, mount path `/data/vault`)
2. Set `OBSIDIAN_VAULT_PATH=/data/vault` in Render env vars
3. Upload vault markdown files to `/data/vault` (one-time, or via deploy script)
4. Run the indexing pipeline to populate `vault_embeddings` in Supabase

**Impact:** Both BM25 and vector paths become functional. `vector_chunks` will reflect actual indexed count. Confidence scoring becomes meaningful.

**No code changes are warranted** until vault data is present on Render. The retrieval logic is correct. The gap is purely infrastructure.

---

## Current RAG Self-Check

```json
"rag": {"ok": true, "vault_reachable": true, "vector_chunks": null}
```

`vault_reachable: true` with `vector_chunks: null` is a misleading healthy signal. Consider adding a check: `has_data: vector_chunks > 0` to distinguish "code works" from "system is useful". This would surface the empty-index condition without marking RAG as failed.
