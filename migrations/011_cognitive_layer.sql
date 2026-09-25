-- Migration 011: Cognitive Layer
-- Tables for all behavioral intelligence and cognitive control engines.
-- Run after 010_intelligence_layer.sql.

-- Cognitive policy decisions — one row per task
CREATE TABLE IF NOT EXISTS cognitive_policy_decisions (
    decision_id         TEXT PRIMARY KEY,
    task_id             TEXT NOT NULL,
    trace_id            TEXT,
    objective           TEXT,
    reasoning_mode      TEXT NOT NULL DEFAULT 'ANALYTICAL',
    planning_mode       TEXT NOT NULL DEFAULT 'STANDARD',
    execution_mode      TEXT NOT NULL DEFAULT 'STANDARD',
    verification_mode   TEXT NOT NULL DEFAULT 'STANDARD',
    autonomy_mode       TEXT NOT NULL DEFAULT 'SUPERVISED',
    cognitive_controls  JSONB DEFAULT '{}'::jsonb,
    evidence            JSONB DEFAULT '[]'::jsonb,
    confidence          NUMERIC(4,3) DEFAULT 0.5,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpd_task ON cognitive_policy_decisions(task_id);
CREATE INDEX IF NOT EXISTS idx_cpd_created ON cognitive_policy_decisions(created_at DESC);

-- Behavioral modifications — active constraints per task
CREATE TABLE IF NOT EXISTS behavioral_modifications (
    modification_id         TEXT PRIMARY KEY,
    task_id                 TEXT NOT NULL,
    trace_id                TEXT,
    autonomy_level          INTEGER NOT NULL DEFAULT 2,
    execution_constraints   JSONB DEFAULT '[]'::jsonb,
    routing_overrides       JSONB DEFAULT '{}'::jsonb,
    approval_requirements   JSONB DEFAULT '[]'::jsonb,
    verification_requirements JSONB DEFAULT '[]'::jsonb,
    retry_strategy          JSONB DEFAULT '{}'::jsonb,
    rollback_strategy       JSONB DEFAULT '{}'::jsonb,
    monitoring_requirements JSONB DEFAULT '[]'::jsonb,
    evidence_sources        JSONB DEFAULT '[]'::jsonb,
    confidence              NUMERIC(4,3) DEFAULT 0.5,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bm_task ON behavioral_modifications(task_id);

-- Autonomy decisions — one row per autonomy evaluation
CREATE TABLE IF NOT EXISTS autonomy_decisions (
    decision_id             TEXT PRIMARY KEY,
    task_id                 TEXT NOT NULL,
    trace_id                TEXT,
    autonomy_level          INTEGER NOT NULL,
    autonomy_label          TEXT NOT NULL,
    knowledge_confidence    NUMERIC(4,3),
    validation_count        INTEGER,
    incident_score          NUMERIC(4,3),
    contradiction_score     NUMERIC(4,3),
    outcome_score           NUMERIC(4,3),
    decision_confidence     NUMERIC(4,3),
    skill_confidence        NUMERIC(4,3),
    composite_confidence    NUMERIC(4,3),
    rationale               TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_task ON autonomy_decisions(task_id);
CREATE INDEX IF NOT EXISTS idx_ad_level ON autonomy_decisions(autonomy_level);

-- Retrieval policy decisions — what/how much to retrieve per task
CREATE TABLE IF NOT EXISTS retrieval_policy_decisions (
    policy_id               TEXT PRIMARY KEY,
    task_id                 TEXT NOT NULL,
    trace_id                TEXT,
    task_type               TEXT,
    risk_level              TEXT,
    memory_types            JSONB DEFAULT '[]'::jsonb,
    retrieval_depth         TEXT DEFAULT 'standard',
    retrieval_strategy      TEXT DEFAULT 'hybrid',
    retrieval_budget        INTEGER DEFAULT 5000,
    graph_depth             INTEGER DEFAULT 2,
    confidence_requirements NUMERIC(4,3) DEFAULT 0.5,
    policy_rationale        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rpd_task ON retrieval_policy_decisions(task_id);

-- Retrieval evaluations — did retrieved knowledge actually help?
CREATE TABLE IF NOT EXISTS retrieval_evaluations (
    eval_id             TEXT PRIMARY KEY,
    task_id             TEXT NOT NULL,
    trace_id            TEXT,
    retrieval_policy_id TEXT,
    precision_score     NUMERIC(4,3),
    recall_score        NUMERIC(4,3),
    usefulness_score    NUMERIC(4,3),
    influence_score     NUMERIC(4,3),
    outcome_impact      NUMERIC(4,3),
    sources_used        JSONB DEFAULT '{}'::jsonb,
    sources_helpful     JSONB DEFAULT '{}'::jsonb,
    task_success        BOOLEAN,
    evaluation_method   TEXT DEFAULT 'outcome_proxy',
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_re_task ON retrieval_evaluations(task_id);
CREATE INDEX IF NOT EXISTS idx_re_created ON retrieval_evaluations(created_at DESC);

-- Knowledge decay assessments — per knowledge record, decay tracking
CREATE TABLE IF NOT EXISTS knowledge_decay_assessments (
    assessment_id       TEXT PRIMARY KEY,
    memory_id           TEXT NOT NULL,
    memory_table        TEXT NOT NULL,
    original_confidence NUMERIC(4,3),
    current_confidence  NUMERIC(4,3),
    decay_rate          NUMERIC(6,5) DEFAULT 0.005,
    days_since_validated INTEGER DEFAULT 0,
    days_since_used     INTEGER DEFAULT 0,
    contradiction_count INTEGER DEFAULT 0,
    revalidation_needed BOOLEAN DEFAULT FALSE,
    superseded          BOOLEAN DEFAULT FALSE,
    decay_reason        TEXT,
    assessed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(memory_id, memory_table)
);
CREATE INDEX IF NOT EXISTS idx_kda_memory ON knowledge_decay_assessments(memory_id, memory_table);
CREATE INDEX IF NOT EXISTS idx_kda_reval ON knowledge_decay_assessments(revalidation_needed) WHERE revalidation_needed = TRUE;

-- Meta-reasoning observations — quality of reasoning/planning/execution per task
CREATE TABLE IF NOT EXISTS meta_reasoning_observations (
    observation_id      TEXT PRIMARY KEY,
    task_id             TEXT NOT NULL,
    trace_id            TEXT,
    reasoning_mode      TEXT,
    reasoning_quality   NUMERIC(4,3),
    planning_quality    NUMERIC(4,3),
    decision_quality    NUMERIC(4,3),
    prediction_accuracy NUMERIC(4,3),
    execution_quality   NUMERIC(4,3),
    adaptation_quality  NUMERIC(4,3),
    task_success        BOOLEAN,
    cost_usd            NUMERIC(8,5),
    duration_ms         INTEGER,
    failure_stage       TEXT,
    observations        JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mro_task ON meta_reasoning_observations(task_id);
CREATE INDEX IF NOT EXISTS idx_mro_created ON meta_reasoning_observations(created_at DESC);

-- Cognitive performance metrics — time-series intelligence growth
CREATE TABLE IF NOT EXISTS cognitive_performance_metrics (
    metric_id           TEXT PRIMARY KEY,
    metric_type         TEXT NOT NULL,  -- weekly|monthly|quarterly
    period_label        TEXT NOT NULL,
    reasoning_accuracy  NUMERIC(4,3),
    planning_accuracy   NUMERIC(4,3),
    decision_accuracy   NUMERIC(4,3),
    prediction_accuracy NUMERIC(4,3),
    execution_success   NUMERIC(4,3),
    adaptation_success  NUMERIC(4,3),
    improvement_success NUMERIC(4,3),
    overall_score       NUMERIC(4,3),
    task_count          INTEGER DEFAULT 0,
    cost_per_task       NUMERIC(8,5),
    avg_duration_ms     INTEGER,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(metric_type, period_label)
);
CREATE INDEX IF NOT EXISTS idx_cpm_period ON cognitive_performance_metrics(period_label DESC);

-- Cognitive evolution proposals — recommended policy changes
CREATE TABLE IF NOT EXISTS cognitive_evolution_proposals (
    proposal_id         TEXT PRIMARY KEY,
    proposal_type       TEXT NOT NULL,  -- reasoning|planning|execution|autonomy|retrieval
    title               TEXT NOT NULL,
    description         TEXT,
    evidence            JSONB DEFAULT '[]'::jsonb,
    confidence          NUMERIC(4,3),
    risk_level          TEXT DEFAULT 'low',
    status              TEXT DEFAULT 'pending',  -- pending|approved|deployed|rejected
    approved_by         TEXT,
    deployed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cep_status ON cognitive_evolution_proposals(status);
CREATE INDEX IF NOT EXISTS idx_cep_type ON cognitive_evolution_proposals(proposal_type);

-- Intelligence reports — organizational intelligence (predictive, not just retrospective)
CREATE TABLE IF NOT EXISTS intelligence_reports (
    report_id           TEXT PRIMARY KEY,
    report_type         TEXT NOT NULL,  -- weekly|monthly|quarterly
    period_label        TEXT NOT NULL,
    failure_predictors  JSONB DEFAULT '[]'::jsonb,
    success_predictors  JSONB DEFAULT '[]'::jsonb,
    top_procedures      JSONB DEFAULT '[]'::jsonb,
    top_skills          JSONB DEFAULT '[]'::jsonb,
    risk_correlations   JSONB DEFAULT '[]'::jsonb,
    improvement_efficacy JSONB DEFAULT '{}' ::jsonb,
    insights            JSONB DEFAULT '[]'::jsonb,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(report_type, period_label)
);

-- Digital twin simulations — what-if analysis results
CREATE TABLE IF NOT EXISTS digital_twin_simulations (
    simulation_id       TEXT PRIMARY KEY,
    simulation_type     TEXT NOT NULL,  -- policy|procedure|autonomy|improvement
    scenario_label      TEXT NOT NULL,
    inputs              JSONB DEFAULT '{}'::jsonb,
    predicted_outcome   JSONB DEFAULT '{}'::jsonb,
    risk_estimate       NUMERIC(4,3),
    benefit_estimate    NUMERIC(4,3),
    confidence          NUMERIC(4,3),
    recommendation      TEXT,
    actual_outcome      JSONB,  -- filled in post-deployment if applicable
    simulation_error    NUMERIC(4,3),  -- |predicted - actual|
    simulated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dts_type ON digital_twin_simulations(simulation_type);
CREATE INDEX IF NOT EXISTS idx_dts_simulated ON digital_twin_simulations(simulated_at DESC);

-- Execution strategy decisions — how execution was configured per task
CREATE TABLE IF NOT EXISTS execution_strategy_decisions (
    strategy_id         TEXT PRIMARY KEY,
    task_id             TEXT NOT NULL,
    trace_id            TEXT,
    parallelism         INTEGER DEFAULT 1,
    max_retries         INTEGER DEFAULT 3,
    verification_depth  TEXT DEFAULT 'standard',
    rollback_policy     TEXT DEFAULT 'on_failure',
    approval_gates      JSONB DEFAULT '[]'::jsonb,
    monitoring_policy   JSONB DEFAULT '{}'::jsonb,
    deployment_policy   TEXT DEFAULT 'standard',
    strategy_evidence   JSONB DEFAULT '[]'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_esd_task ON execution_strategy_decisions(task_id);

COMMENT ON TABLE cognitive_policy_decisions   IS 'Phase 4 — cognitive-policy-engine: how the system thinks per task';
COMMENT ON TABLE behavioral_modifications      IS 'Phase 3 — behavior-modification-engine: runtime behavioral constraints';
COMMENT ON TABLE autonomy_decisions            IS 'Phase 8 — confidence-aware-autonomy-engine: autonomy level per task';
COMMENT ON TABLE retrieval_policy_decisions    IS 'Phase 2 — retrieval-policy-engine: what/how much to retrieve';
COMMENT ON TABLE retrieval_evaluations         IS 'Phase 10 — retrieval-evaluation-engine: was retrieval useful?';
COMMENT ON TABLE knowledge_decay_assessments   IS 'Phase 11 — knowledge-decay-engine: confidence decay over time';
COMMENT ON TABLE meta_reasoning_observations   IS 'Phase 12 — meta-reasoning-engine: quality of cognition per task';
COMMENT ON TABLE cognitive_performance_metrics IS 'Phase 13 — cognitive-performance-engine: long-term intelligence growth';
COMMENT ON TABLE cognitive_evolution_proposals IS 'Phase 14 — cognitive-evolution-engine: recommended policy changes';
COMMENT ON TABLE intelligence_reports          IS 'Phase 15 — organizational-intelligence-engine: predictive intelligence';
COMMENT ON TABLE digital_twin_simulations      IS 'Phase 16 — cognitive-digital-twin: simulation results';
COMMENT ON TABLE execution_strategy_decisions  IS 'Phase 7 — execution-strategy-engine: execution configuration per task';
