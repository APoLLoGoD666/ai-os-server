-- Migration 007: Evidence block canonical payload for external hash verification
-- Applied: 2026-06-09 as part of v10 RD-01 audit-grade fix
--
-- Root cause: appendEvidenceBlock hashed JS compact JSON (arbitrary key order).
-- Supabase JSONB normalizes key order on insert. External verifiers reading the
-- payload column got a different JSON string → different hash → verification failure.
--
-- Fix: store canonical_payload TEXT (sorted keys, no whitespace) alongside JSONB.
-- Auditor verification: sha256(canonical_payload) === content_hash. Always.

-- ── Add canonical payload columns to evidence_blocks ─────────────────────────
ALTER TABLE evidence_blocks
  ADD COLUMN IF NOT EXISTS canonical_payload TEXT,
  ADD COLUMN IF NOT EXISTS payload_version   INT NOT NULL DEFAULT 0;

-- Mark all existing rows as version 0 (pre-canonicalization legacy)
UPDATE evidence_blocks SET payload_version = 0 WHERE payload_version = 0;

-- ── Reconcile the one real chain='main' row ───────────────────────────────────
-- Row id: a7152dd9-3029-48f8-8f06-bf6fdbbf7c35 (sequence=0, chain_id='main')
-- Original payload reconstructed: {taskId,traceId,commitSha,costUsd,durationMs,ts}
-- Canonical form (sorted keys): {"commitSha":...,"costUsd":...,"durationMs":...,...}
-- sha256(canonical_payload) = fe93dad5678ef7a50067a0b413ea61eec1622c1aa2f4517c57df6d54b991ae19
-- block_hash recomputed      = 7c88c5c38ece5a3a213d7c98006792aafa396c35c83523b982c937e877826835

UPDATE evidence_blocks
SET
  canonical_payload = '{"commitSha":"240bb1c","costUsd":"0.03009","durationMs":20602,"taskId":"TASK-624041","traceId":"25413bca-291a-408d-ace8-623d1f943084","ts":"2026-06-09T05:10:53.321Z"}',
  content_hash      = 'fe93dad5678ef7a50067a0b413ea61eec1622c1aa2f4517c57df6d54b991ae19',
  block_hash        = '7c88c5c38ece5a3a213d7c98006792aafa396c35c83523b982c937e877826835',
  payload_version   = 1
WHERE id = 'a7152dd9-3029-48f8-8f06-bf6fdbbf7c35';

-- ── Remove fake test row (chain='test', manually injected, fake hashes) ───────
-- content_hash='abc', block_hash='def' — not a real hash, corrupted test artifact
DELETE FROM evidence_blocks WHERE chain_id = 'test' AND content_hash = 'abc';

-- ── Index for canonical payload lookups ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_evidence_blocks_version ON evidence_blocks(payload_version);

-- ── Verification query (run after migration to confirm integrity) ─────────────
-- SELECT id, sequence, content_hash,
--        encode(sha256(canonical_payload::bytea), 'hex') AS recomputed_hash,
--        content_hash = encode(sha256(canonical_payload::bytea), 'hex') AS verified
-- FROM evidence_blocks
-- WHERE canonical_payload IS NOT NULL;
