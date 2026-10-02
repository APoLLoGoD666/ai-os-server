-- Migration 012 — Cognitive Effectiveness & Self-Evolution Verification
-- Creates tables for: outcome attribution, twin accuracy, policy settings, benchmarks

-- ── Outcome Attribution Records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outcome_attribution_records (
    attribution_id       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    task_id              TEXT NOT NULL,
    trace_id             TEXT,
    task_success         BOOLEAN,
    complexity           TEXT,
    cost_usd             FLOAT,
    duration_ms          INT,
    -- Per-controller impact scores (-1.0 to +1.0, 0 = no measured effect)
    reasoning_impact     FLOAT DEFAULT 0,
    planning_impact      FLOAT DEFAULT 0,
    execution_impact     FLOAT DEFAULT 0,
    behavior_impact      FLOAT DEFAULT 0,
    autonomy_impact      FLOAT DEFAULT 0,
    routing_impact       FLOAT DEFAULT 0,
    twin_impact          FLOAT DEFAULT 0,
    overall_cognitive_impact FLOAT DEFAULT 0,
    -- Cognitive snapshot
    reasoning_mode       TEXT,
    planning_mode        TEXT,
    autonomy_level       INT,
    plan_depth           INT,
    max_retries          INT,
    verification_depth   TEXT,
    model_adapted        BOOLEAN DEFAULT FALSE,
    twin_sim_id          TEXT,
    -- Baseline comparison
    complexity_baseline_success FLOAT,
    -- Evidence
    evidence             JSONB DEFAULT '{}',
    created_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oar_task_id      ON outcome_attribution_records(task_id);
CREATE INDEX IF NOT EXISTS idx_oar_created_at   ON outcome_attribution_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oar_success      ON outcome_attribution_records(task_success);
CREATE INDEX IF NOT EXISTS idx_oar_complexity   ON outcome_attribution_records(complexity);
COMMENT ON TABLE outcome_attribution_records IS 'Per-task attribution of cognitive decisions to outcomes. Answers: which decisions helped?';

-- ── Digital Twin Accuracy Records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS twin_accuracy_records (
    accuracy_id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    sim_id                   TEXT NOT NULL,
    task_id                  TEXT,
    -- Prediction
    predicted_recommendation TEXT,
    predicted_risk           FLOAT,
    predicted_benefit        FLOAT,
    predicted_confidence     FLOAT,
    -- Actual outcome
    actual_success           BOOLEAN,
    actual_cost_usd          FLOAT,
    actual_duration_ms       INT,
    actual_failed_stage      TEXT,
    -- Accuracy metrics
    forecast_accuracy        FLOAT,  -- 0-1: how close was recommendation to outcome
    risk_calibration_error   FLOAT,  -- |predicted_risk - actual_risk_proxy|
    benefit_calibration_error FLOAT, -- |predicted_benefit - actual_benefit_proxy|
    was_false_positive       BOOLEAN, -- predicted do_not_deploy but task succeeded
    was_false_negative       BOOLEAN, -- predicted recommended but task failed
    created_at               TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tar_sim_id      ON twin_accuracy_records(sim_id);
CREATE INDEX IF NOT EXISTS idx_tar_task_id     ON twin_accuracy_records(task_id);
CREATE INDEX IF NOT EXISTS idx_tar_created_at  ON twin_accuracy_records(created_at DESC);
COMMENT ON TABLE twin_accuracy_records IS 'Compares digital twin predictions to actual task outcomes for calibration.';

-- ── Cognitive Policy Settings ─────────────────────────────────────────────────
-- Runtime-configurable policy defaults that evolved policies can update.
CREATE TABLE IF NOT EXISTS cognitive_policy_settings (
    setting_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    policy_name     TEXT NOT NULL UNIQUE,
    policy_value    JSONB NOT NULL,
    previous_value  JSONB,
    rationale       TEXT,
    evidence        JSONB DEFAULT '{}',
    approved_by     TEXT,
    applied_at      TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cps_policy_name ON cognitive_policy_settings(policy_name);
COMMENT ON TABLE cognitive_policy_settings IS 'Runtime-configurable cognitive policy settings. Updated via governance-approved policy evolution.';

-- Seed default policy settings
INSERT INTO cognitive_policy_settings (policy_name, policy_value, rationale) VALUES
    ('default_reasoning_mode',   '{"value": "ANALYTICAL"}',  'Initial default — updated by policy evolution based on attribution data')
    ON CONFLICT (policy_name) DO NOTHING;
INSERT INTO cognitive_policy_settings (policy_name, policy_value, rationale) VALUES
    ('default_plan_depth',       '{"value": 2}',             'Initial default — updated by policy evolution based on attribution data')
    ON CONFLICT (policy_name) DO NOTHING;
INSERT INTO cognitive_policy_settings (policy_name, policy_value, rationale) VALUES
    ('default_autonomy_threshold','{"value": 0.45}',          'Minimum composite_score for LEVEL_2 autonomy')
    ON CONFLICT (policy_name) DO NOTHING;
INSERT INTO cognitive_policy_settings (policy_name, policy_value, rationale) VALUES
    ('fail_closed_tiers',        '{"value": ["critical","complex"]}', 'Complexity tiers that require fail-closed runtime behavior')
    ON CONFLICT (policy_name) DO NOTHING;
INSERT INTO cognitive_policy_settings (policy_name, policy_value, rationale) VALUES
    ('evolution_trigger_threshold','{"fail_rate": 0.40, "avg_quality": 0.45}', 'Thresholds for triggering cognitive evolution')
    ON CONFLICT (policy_name) DO NOTHING;

-- ── Benchmark Results ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benchmark_results (
    benchmark_id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    benchmark_name   TEXT NOT NULL,
    scenario_name    TEXT NOT NULL,
    -- Quality scores (0-1)
    reasoning_score  FLOAT,
    planning_score   FLOAT,
    execution_score  FLOAT,
    autonomy_score   FLOAT,
    forecast_score   FLOAT,
    adaptation_score FLOAT,
    overall_score    FLOAT,
    -- Context
    policy_snapshot  JSONB DEFAULT '{}',
    run_metadata     JSONB DEFAULT '{}',
    ran_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_name         ON benchmark_results(benchmark_name);
CREATE INDEX IF NOT EXISTS idx_br_scenario     ON benchmark_results(scenario_name);
CREATE INDEX IF NOT EXISTS idx_br_ran_at       ON benchmark_results(ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_br_overall      ON benchmark_results(overall_score);
COMMENT ON TABLE benchmark_results IS 'Repeatable cognitive benchmark results. Compare before/after policy updates.';
