-- 025_wm_session_type_constraint.sql
-- Adds UNIQUE constraint on (session_id, memory_type) to working_memory.
-- Required by working-memory.js set() which upserts on conflict 'session_id,memory_type'.
-- This constraint was applied directly to the live DB and is captured here retroactively.

ALTER TABLE working_memory
    ADD CONSTRAINT uq_wm_session_type UNIQUE (session_id, memory_type);
