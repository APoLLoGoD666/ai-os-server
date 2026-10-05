-- Migration 035: Add FK constraints on task_id columns referencing apex_agent_runs
-- M13 fix: task_id TEXT columns in episodic_memory, behavioral_modifications,
-- agent_decisions lack FK constraints, allowing orphaned rows.
-- NOT VALID: constraint applies to new rows only — existing data not scanned.
-- Run VALIDATE CONSTRAINT later during a maintenance window if needed.

ALTER TABLE episodic_memory
    ADD CONSTRAINT fk_em_task_id
    FOREIGN KEY (task_id)
    REFERENCES apex_agent_runs(task_id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
    NOT VALID;

ALTER TABLE behavioral_modifications
    ADD CONSTRAINT fk_bm_task_id
    FOREIGN KEY (task_id)
    REFERENCES apex_agent_runs(task_id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
    NOT VALID;

ALTER TABLE agent_decisions
    ADD CONSTRAINT fk_ad_task_id
    FOREIGN KEY (task_id)
    REFERENCES apex_agent_runs(task_id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED
    NOT VALID;
