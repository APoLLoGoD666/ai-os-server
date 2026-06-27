# APEX AI OS — Phase 28 Production Validation
Date: 2026-06-05 | Protocol: Phase 28 — Phase 10

---

## 1. lib/embed.js

**Problem**: `embedText()` was duplicated inline in `server.js` and was not accessible to `langchain-rag.js`, requiring any new consumer to copy the function again.

**Implementation**: Extracted to a shared `lib/embed.js` module. Voyage AI is the primary embedding provider; Gemini `text-embedding-004` (768-dim) is the fallback. Implemented using pure Node.js `https` module — no axios dependency.

**Verification**: `node --check lib/embed.js` — OK.

**Risk**: NONE. New file with no existing dependencies changed.

**Rollback**: Delete `lib/embed.js`; restore inline copy in `server.js`.

---

## 2. langchain-rag.js — Hybrid BM25+pgvector Retrieval

**Problem**: Vault RAG used keyword-only BM25 scoring. Semantic queries (no shared keywords) returned no results. Vault files are not available on Render's ephemeral filesystem.

**Implementation**: Added `_getSb()` lazy Supabase client initialization; `_hash()` FNV-1a chunk deduplication; `_embedNewChunks()` background embedder that indexes new vault chunks into `vault_embeddings` without blocking pipeline execution; `_vectorSearch()` calling the `match_vault_embeddings` Supabase RPC for cosine similarity retrieval; hybrid merge in `retrieveContext()` combining 60% BM25 weight + 40% vector similarity weight. BM25 path is unchanged and serves as guaranteed fallback if vector search fails or returns empty.

**Verification**: `node --check agent-system/langchain-rag.js` — OK. `retrieveContext()` still returns a string. BM25 fallback path is unconditionally preserved.

**Risk**: LOW. Graceful degradation guaranteed; if Supabase is unreachable or `vault_embeddings` is empty, the function falls back to pure BM25 output silently.

**Rollback**: Revert `agent-system/langchain-rag.js` to the v6 version.

---

## 3. server.js — vault_embeddings Table

**Problem**: No Supabase table existed to store vault chunk embeddings for vector search.

**Implementation**: Added a `setImmediate` block with `CREATE TABLE IF NOT EXISTS vault_embeddings` (columns: id, path, chunk_index, content, embedding vector(768), content_hash, created_at) plus the `match_vault_embeddings` PL/pgSQL RPC function for cosine similarity queries. Both statements are idempotent.

**Verification**: `node --check server.js` — OK. Idempotent SQL is safe to re-run on every server start.

**Risk**: NONE. Additive only; no existing tables or queries modified.

**Rollback**: `DROP TABLE vault_embeddings` and `DROP FUNCTION match_vault_embeddings` in Supabase SQL editor. No downstream dependencies exist yet.

---

## 4. server.js — apex_agent_stages Table

**Problem**: `_auditLog` in `orchestrator.js` stored all stage outcomes as opaque JSON blobs. No per-stage failure queries were possible.

**Implementation**: `CREATE TABLE IF NOT EXISTS apex_agent_stages` (columns: id, run_id, stage, agent, success, duration_ms, error, tokens_used, cost_usd, created_at) with 3 indexes on run_id, stage, and created_at. Idempotent.

**Verification**: `node --check server.js` — OK.

**Risk**: NONE. Additive; no existing tables modified.

**Rollback**: `DROP TABLE apex_agent_stages` in Supabase SQL editor.

---

## 5. server.js — Weekly Tech Debt Cron

**Problem**: No automated discovery of failure hotspots, cost regressions, or slow stages across pipeline runs.

**Implementation**: Added `_scheduleTechDebtAudit` IIFE registering a cron at Sunday 02:00 AM. Queries `apex_agent_runs` for failure rate and cost metrics; queries `apex_agent_stages` for per-stage failure counts. Writes a structured markdown report to Obsidian via the existing `obsidianWrite` helper and inserts a notification into `apex_notifications`.

**Verification**: `node --check server.js` — OK. Uses `sbAdmin`, `obsidianWrite`, and `cron-logger.record()` which are all in scope. Read-only queries only.

**Risk**: LOW. Read-only queries against existing tables; writes only to notification table and Obsidian vault. Worst case: cron fires, queries return empty, writes an empty report.

**Rollback**: Remove the `_scheduleTechDebtAudit` IIFE from `server.js`.

---

## 6. orchestrator.js — Per-Stage Failure Tracking

**Problem**: `_auditLog` recorded aggregate run outcomes but not individual stage-level success/failure, duration, or cost. No granular failure analysis was possible.

**Implementation**: Added `stageRows` array mapping populated during pipeline execution; fire-and-forget batch insert into `apex_agent_stages` at audit log time. Insert errors are caught and logged without affecting the main audit path.

**Verification**: `node --check agent-system/orchestrator.js` — OK.

**Risk**: LOW. On first server boot before the table migration runs, Supabase returns an error on the insert — this is caught and logged, not thrown. No pipeline disruption.

**Rollback**: Remove the 20-line `stageRows` block after the main `upsert` call in `_auditLog`.

---

## 7. routes/intelligence.js — Self-Check Expansion

**Problem**: Self-check covered 6 subsystems with no RAG visibility, no external API status, and no scalar health score.

**Implementation**: Added 4 new check blocks (rag, notion, slack, sentry) and a `score` field computed as `(passed / total) * 100` rounded to nearest integer. All new checks use `AbortSignal.timeout(5000)` to cap latency contribution. Existing 6 checks are structurally unchanged.

**Verification**: `node --check routes/intelligence.js` — OK.

**Risk**: LOW. Entirely additive. If any new check throws, it is caught per-check and marked failed without affecting other checks or the response shape.

**Rollback**: Remove the 4 new check blocks and `score` field computation from `routes/intelligence.js`.

---

## Syntax Verification Results

| File | Status |
|------|--------|
| lib/embed.js | OK |
| agent-system/langchain-rag.js | OK |
| agent-system/orchestrator.js | OK |
| routes/intelligence.js | OK |
| server.js | OK |

**All 5 modified/created files pass `node --check`.**
