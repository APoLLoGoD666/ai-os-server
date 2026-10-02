-- 081_obs_record_id_propagation.sql
-- T3-P2: Observation Pipeline Propagation — add obs_record_id to knowledge_validation_queue.
--
-- Authority: APEX-CONSTITUTION-v1.0; T3-P2-PHASE-0-AUDIT.md (AUTHORIZED);
--            RT09-INV-1 (EvidenceObject.observation_projection_ref provenance requirement).
--
-- Purpose: Links a knowledge_validation_queue entry to the RT-08 ObservationRecord that
-- triggered it. obs_record_id = ObservationRecord.record_id (format: OBS-{claim_uuid}-{ts}).
-- Used by T3-10 (EvidenceObject) to populate EvidenceObject.observation_projection_ref,
-- satisfying RT09-INV-1 and D8 INV-4 (Reality Grounding).
--
-- Nullable: existing queue entries pre-date T3-P2 and have no obs_record_id.
-- New entries submitted via submitLesson({ obsRecordId }) will carry the link.

ALTER TABLE knowledge_validation_queue
    ADD COLUMN IF NOT EXISTS obs_record_id TEXT;

CREATE INDEX IF NOT EXISTS idx_kvq_obs_record_id
    ON knowledge_validation_queue (obs_record_id)
    WHERE obs_record_id IS NOT NULL;
