-- T3-P5: Domain Provenance Propagation
-- Authority: T3-P5-DOMAIN-PROVENANCE-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-03)
--            D8 INV-4 (Reality Grounding); RT11-INV-3; R10-v1.1 RS-10.1
--
-- Adds domain_id column to knowledge_validation_queue so that callers
-- (orchestrator, chat, agents) can assert the constitutional domain of a lesson.
-- Nullable: existing rows remain valid; null → DOM-000008 default (L-P5-04).
-- Pattern: identical to 081_obs_record_id_propagation.sql (T3-P2 precedent).

ALTER TABLE knowledge_validation_queue
    ADD COLUMN IF NOT EXISTS domain_id TEXT;

-- Indexed for future per-domain DUM queries (RT11-INV-3 aggregation readiness).
CREATE INDEX IF NOT EXISTS idx_kvq_domain_id
    ON knowledge_validation_queue (domain_id)
    WHERE domain_id IS NOT NULL;
