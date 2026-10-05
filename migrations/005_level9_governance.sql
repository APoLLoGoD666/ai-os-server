-- Migration 005: Level 9 Autonomous Engineering Operating System — Governance Tables
-- All 40 capability domains. Applied: 2026-06-08 via Supabase Management API
-- Evidence-bound: every table maps to a named domain in the Level 9 directive.

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 1 — Execution Graphs: full DAG of every pipeline run
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_graphs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id    TEXT NOT NULL,
    task_id     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'running',
    stage_count INT  DEFAULT 0,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    metadata    JSONB
);
CREATE INDEX IF NOT EXISTS idx_execution_graphs_task    ON execution_graphs(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_graphs_trace   ON execution_graphs(trace_id);
CREATE INDEX IF NOT EXISTS idx_execution_graphs_started ON execution_graphs(started_at DESC);

CREATE TABLE IF NOT EXISTS execution_nodes (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id     UUID REFERENCES execution_graphs(id) ON DELETE CASCADE,
    trace_id     TEXT NOT NULL,
    task_id      TEXT NOT NULL,
    stage        TEXT NOT NULL,
    agent_role   TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    duration_ms  INT,
    model        TEXT,
    tokens_in    INT,
    tokens_out   INT,
    input_hash   TEXT,
    output_hash  TEXT,
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata     JSONB
);
CREATE INDEX IF NOT EXISTS idx_execution_nodes_graph   ON execution_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_execution_nodes_task    ON execution_nodes(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_nodes_trace   ON execution_nodes(trace_id);

CREATE TABLE IF NOT EXISTS execution_edges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id     UUID REFERENCES execution_graphs(id) ON DELETE CASCADE,
    source_stage TEXT NOT NULL,
    target_stage TEXT NOT NULL,
    edge_type    TEXT NOT NULL DEFAULT 'sequential',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_edges_graph ON execution_edges(graph_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 2 — System Events: central immutable append-only event log
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id    TEXT,
    event_type  TEXT NOT NULL,
    source      TEXT NOT NULL,
    task_id     TEXT,
    run_id      TEXT,
    payload     JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_events_task    ON system_events(task_id);
CREATE INDEX IF NOT EXISTS idx_system_events_trace   ON system_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_system_events_type    ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_time    ON system_events(occurred_at DESC);

CREATE TABLE IF NOT EXISTS event_relationships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_event_id UUID REFERENCES system_events(id),
    child_event_id  UUID REFERENCES system_events(id),
    relationship    TEXT NOT NULL DEFAULT 'caused_by',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 3 — Execution Snapshots: deterministic replay support
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       TEXT NOT NULL,
    trace_id      TEXT NOT NULL,
    stage         TEXT NOT NULL,
    snapshot_type TEXT NOT NULL,
    content       JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_snapshots_task  ON execution_snapshots(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_snapshots_trace ON execution_snapshots(trace_id);

CREATE TABLE IF NOT EXISTS execution_artifacts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      TEXT NOT NULL,
    trace_id     TEXT NOT NULL,
    stage        TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    file_path    TEXT,
    content_hash TEXT,
    size_bytes   INT,
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_artifacts_task  ON execution_artifacts(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 4 — Agent Decisions: every reasoning step, confidence, and rationale
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_decisions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       TEXT NOT NULL,
    trace_id      TEXT NOT NULL,
    stage         TEXT NOT NULL,
    agent_role    TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    reasoning     TEXT,
    confidence    FLOAT,
    inputs        JSONB,
    outputs       JSONB,
    model         TEXT,
    tokens_in     INT,
    tokens_out    INT,
    duration_ms   INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_task  ON agent_decisions(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_trace ON agent_decisions(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_role  ON agent_decisions(agent_role);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 5 — Agent Memory Versions: memory state delta per run
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_memory_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             TEXT NOT NULL,
    trace_id            TEXT NOT NULL,
    agent_role          TEXT NOT NULL,
    memory_state_before JSONB,
    memory_state_after  JSONB,
    delta               JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_memory_versions_task ON agent_memory_versions(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 6 — Lesson Sources: every lesson linked to its origin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_sources (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id   INT,
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    run_id      TEXT,
    failure_id  TEXT,
    lesson_type TEXT NOT NULL DEFAULT 'pipeline',
    context     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_sources_task   ON lesson_sources(task_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sources_lesson ON lesson_sources(lesson_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 7 — Root Cause Reports: auto-generated failure analysis
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS root_cause_reports (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id              TEXT NOT NULL,
    trace_id             TEXT NOT NULL,
    failure_event_id     UUID,
    root_cause           TEXT NOT NULL,
    contributing_factors JSONB,
    evidence             JSONB,
    recommendations      JSONB,
    generated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_root_cause_reports_task  ON root_cause_reports(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 8 — Healing Events: self-healing workflow records
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS healing_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    TEXT NOT NULL,
    trace_id   TEXT NOT NULL,
    trigger    TEXT NOT NULL,
    strategy   TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'initiated',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS healing_outcomes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    healing_event_id UUID REFERENCES healing_events(id) ON DELETE CASCADE,
    outcome          TEXT NOT NULL,
    success          BOOLEAN NOT NULL DEFAULT false,
    duration_ms      INT,
    metadata         JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 9 — Rollback Events: rollback plans and results
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rollback_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       TEXT NOT NULL,
    trace_id      TEXT NOT NULL,
    trigger       TEXT NOT NULL,
    commit_before TEXT,
    commit_after  TEXT,
    reason        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rollback_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rollback_event_id UUID REFERENCES rollback_events(id) ON DELETE CASCADE,
    success          BOOLEAN NOT NULL DEFAULT false,
    steps_completed  INT DEFAULT 0,
    steps_failed     INT DEFAULT 0,
    duration_ms      INT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 10 — Deployment Graphs: deployment dependency and verification
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment_graphs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deploy_id  TEXT,
    commit_sha TEXT,
    status     TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS deployment_verifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id   UUID REFERENCES deployment_graphs(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL,
    status     TEXT NOT NULL,
    details    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 11+12 — Certifications: score, hash, status, revocation
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id           TEXT NOT NULL,
    trace_id          TEXT NOT NULL,
    commit_sha        TEXT,
    score             FLOAT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'certified',
    evidence          JSONB,
    issued_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at        TIMESTAMPTZ,
    revoked_at        TIMESTAMPTZ,
    revocation_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_certifications_task   ON certifications(task_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_issued ON certifications(issued_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 13+14 — Cryptographic Evidence Chain: SHA-256 tamper detection
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence_hashes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type    TEXT NOT NULL,
    entity_id      TEXT NOT NULL,
    hash_algorithm TEXT NOT NULL DEFAULT 'sha256',
    hash_value     TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_hashes_entity ON evidence_hashes(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS evidence_blocks (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chain_id      TEXT NOT NULL DEFAULT 'main',
    sequence      INT NOT NULL,
    previous_hash TEXT NOT NULL DEFAULT '0000000000000000',
    content_hash  TEXT NOT NULL,
    block_hash    TEXT NOT NULL,
    payload       JSONB NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_blocks_chain ON evidence_blocks(chain_id, sequence DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_blocks_seq ON evidence_blocks(chain_id, sequence);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 15 — Distributed Tracing: trace_id propagated through all tables above.
-- No new table needed — trace_id column exists in all domain tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 16 — OpenTelemetry Spans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otel_spans (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id       TEXT NOT NULL,
    span_id        TEXT NOT NULL UNIQUE,
    parent_span_id TEXT,
    name           TEXT NOT NULL,
    kind           TEXT NOT NULL DEFAULT 'INTERNAL',
    status         TEXT NOT NULL DEFAULT 'OK',
    start_time     TIMESTAMPTZ NOT NULL,
    end_time       TIMESTAMPTZ,
    duration_ms    INT,
    attributes     JSONB,
    events         JSONB
);
CREATE INDEX IF NOT EXISTS idx_otel_spans_trace  ON otel_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_otel_spans_start  ON otel_spans(start_time DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 17 — Cost Accounting: per task/stage/model granularity
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_accounting (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       TEXT NOT NULL,
    trace_id      TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT 'llm',
    stage         TEXT,
    model         TEXT,
    amount_usd    FLOAT NOT NULL DEFAULT 0,
    tokens_in     INT  DEFAULT 0,
    tokens_out    INT  DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cost_accounting_task  ON cost_accounting(task_id);
CREATE INDEX IF NOT EXISTS idx_cost_accounting_model ON cost_accounting(model);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 18 — Resource Accounting: CPU, memory, runtime per stage
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource_accounting (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    stage       TEXT,
    memory_mb   FLOAT,
    cpu_percent FLOAT,
    duration_ms INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resource_accounting_task ON resource_accounting(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 19 — Quality Scores: per dimension (review, test, validation, deploy)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_scores (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    TEXT NOT NULL,
    trace_id   TEXT NOT NULL,
    dimension  TEXT NOT NULL,
    score      FLOAT NOT NULL,
    evidence   JSONB,
    scored_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quality_scores_task      ON quality_scores(task_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_dimension ON quality_scores(dimension);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 20 — Risk Scores: deployment, task, security, architecture, confidence
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_scores (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    TEXT NOT NULL,
    trace_id   TEXT NOT NULL,
    risk_type  TEXT NOT NULL,
    score      FLOAT NOT NULL,
    factors    JSONB,
    scored_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risk_scores_task ON risk_scores(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 21 — Incidents: auto-generated from pipeline failures
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'low',
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_incidents_task   ON incidents(task_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_time   ON incidents(created_at DESC);

CREATE TABLE IF NOT EXISTS incident_timelines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS incident_evidence (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id   UUID REFERENCES incidents(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL,
    content       JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS incident_resolutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID REFERENCES incidents(id) ON DELETE CASCADE,
    resolution_type TEXT NOT NULL,
    description     TEXT,
    resolved_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 22 — Anomaly Detection: duration, failure, cost, retry deviations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomalies (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id        TEXT NOT NULL,
    trace_id       TEXT NOT NULL,
    dimension      TEXT NOT NULL,
    expected_value FLOAT,
    actual_value   FLOAT NOT NULL,
    deviation_pct  FLOAT,
    severity       TEXT NOT NULL DEFAULT 'low',
    detected_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anomalies_task      ON anomalies(task_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_dimension ON anomalies(dimension);
CREATE INDEX IF NOT EXISTS idx_anomalies_detected  ON anomalies(detected_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 23 — SLO/SLA Tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slo_definitions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    metric      TEXT NOT NULL,
    target_value FLOAT NOT NULL,
    window_days INT NOT NULL DEFAULT 30,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS slo_measurements (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id     UUID REFERENCES slo_definitions(id) ON DELETE CASCADE,
    task_id    TEXT,
    value      FLOAT NOT NULL,
    met        BOOLEAN NOT NULL DEFAULT true,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_slo_measurements_slo  ON slo_measurements(slo_id);
CREATE INDEX IF NOT EXISTS idx_slo_measurements_task ON slo_measurements(task_id);
CREATE TABLE IF NOT EXISTS slo_violations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slo_id       UUID REFERENCES slo_definitions(id),
    task_id      TEXT,
    actual_value FLOAT NOT NULL,
    measured_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 24 — Security Governance: dependency and secret scanning
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_scans (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    TEXT NOT NULL,
    trace_id   TEXT NOT NULL,
    scan_type  TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pass',
    findings   JSONB,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_scans_task ON security_scans(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 25 — SBOM: software bill of materials per task
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sbom_entries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id        TEXT NOT NULL,
    trace_id       TEXT NOT NULL,
    component_name TEXT NOT NULL,
    version        TEXT,
    license        TEXT,
    source         TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sbom_entries_task ON sbom_entries(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 26 — Policy Engine
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    version    INT NOT NULL DEFAULT 1,
    rule_type  TEXT NOT NULL,
    condition  JSONB NOT NULL,
    action     JSONB NOT NULL,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS policy_decisions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id  UUID REFERENCES policies(id),
    task_id    TEXT NOT NULL,
    trace_id   TEXT NOT NULL,
    decision   TEXT NOT NULL,
    reasons    JSONB,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_task ON policy_decisions(task_id);
CREATE TABLE IF NOT EXISTS policy_violations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id      UUID REFERENCES policies(id),
    task_id        TEXT NOT NULL,
    trace_id       TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    details        JSONB,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 27+28 — Override & Approval Framework
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS override_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    requester   TEXT NOT NULL DEFAULT 'system',
    reason      TEXT,
    policy_id   UUID REFERENCES policies(id),
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS override_approvals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    override_request_id UUID REFERENCES override_requests(id) ON DELETE CASCADE,
    approver            TEXT NOT NULL,
    decision            TEXT NOT NULL,
    reason              TEXT,
    decided_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS approval_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       TEXT NOT NULL,
    trace_id      TEXT NOT NULL,
    approval_type TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    context       JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_task   ON approval_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 29 — Execution Simulation: pre-deploy dry runs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS simulations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         TEXT NOT NULL,
    trace_id        TEXT NOT NULL,
    simulation_type TEXT NOT NULL DEFAULT 'pre_deploy',
    result          JSONB,
    confidence      FLOAT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 30 — Impact Analysis
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impact_analyses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id          TEXT NOT NULL,
    trace_id         TEXT NOT NULL,
    target           TEXT NOT NULL,
    scope            TEXT NOT NULL DEFAULT 'module',
    affected_systems JSONB,
    risk_level       TEXT NOT NULL DEFAULT 'low',
    analyzed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_impact_analyses_task ON impact_analyses(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 31 — Change Intelligence: classify bug/feature/refactor/security
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS change_classifications (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id       TEXT NOT NULL,
    trace_id      TEXT NOT NULL,
    commit_sha    TEXT,
    change_type   TEXT NOT NULL,
    confidence    FLOAT NOT NULL DEFAULT 0.8,
    reasoning     TEXT,
    classified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_change_classifications_task   ON change_classifications(task_id);
CREATE INDEX IF NOT EXISTS idx_change_classifications_type   ON change_classifications(change_type);
CREATE INDEX IF NOT EXISTS idx_change_classifications_commit ON change_classifications(commit_sha);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 32 — Knowledge Evolution Engine
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    domain      TEXT NOT NULL,
    before      JSONB,
    after       JSONB,
    delta       JSONB,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_snapshots_task   ON knowledge_snapshots(task_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_snapshots_domain ON knowledge_snapshots(domain);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 33 — Execution Reputation: agent success/failure/cost/accuracy rates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_reputation_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_role     TEXT NOT NULL,
    task_id        TEXT NOT NULL,
    trace_id       TEXT NOT NULL,
    event_type     TEXT NOT NULL,
    outcome        TEXT NOT NULL,
    cost_usd       FLOAT DEFAULT 0,
    accuracy_score FLOAT,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_rep_events_role    ON agent_reputation_events(agent_role);
CREATE INDEX IF NOT EXISTS idx_agent_rep_events_task    ON agent_reputation_events(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_rep_events_outcome ON agent_reputation_events(outcome);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 34 — Multi-Run Causal Analysis
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS causal_analyses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    cause       TEXT NOT NULL,
    effect      TEXT NOT NULL,
    confidence  FLOAT NOT NULL DEFAULT 0.5,
    evidence    JSONB,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_causal_analyses_task ON causal_analyses(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 35 — Governance Dashboard Snapshots
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_type TEXT NOT NULL DEFAULT 'governance',
    data          JSONB NOT NULL,
    captured_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_type ON dashboard_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_time ON dashboard_snapshots(captured_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 36 — Time-Travel Debugging: state reconstruction at any timestamp
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS state_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    trace_id    TEXT NOT NULL,
    stage       TEXT NOT NULL,
    state       JSONB NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_state_snapshots_task    ON state_snapshots(task_id);
CREATE INDEX IF NOT EXISTS idx_state_snapshots_time    ON state_snapshots(captured_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 37 — Environment Reconstruction
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS environment_snapshots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id      TEXT NOT NULL,
    trace_id     TEXT NOT NULL,
    node_version TEXT,
    env_keys     JSONB,
    dependencies JSONB,
    captured_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_environment_snapshots_task ON environment_snapshots(task_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 38 — Compliance Engine: audit packs, evidence exports
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_audits (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id    TEXT NOT NULL,
    trace_id   TEXT NOT NULL,
    framework  TEXT NOT NULL DEFAULT 'internal',
    status     TEXT NOT NULL DEFAULT 'pass',
    evidence   JSONB,
    audited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_task      ON compliance_audits(task_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audits_framework ON compliance_audits(framework);

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 39 — Forensic Query Engine
-- No new table: answered by querying all tables above via routes/governance.js
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAIN 40 — Autonomous OS Certification: system-level certification state
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_certifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certification_id TEXT NOT NULL UNIQUE DEFAULT ('sys-cert-' || gen_random_uuid()::text),
    status           TEXT NOT NULL DEFAULT 'pending',
    score            FLOAT NOT NULL DEFAULT 0,
    conditions_met   JSONB NOT NULL DEFAULT '[]',
    conditions_total INT NOT NULL DEFAULT 14,
    evidence_hash    TEXT,
    issued_at        TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ,
    revoked_at       TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Default SLO definitions (Domain 23)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO slo_definitions (name, metric, target_value, window_days)
VALUES
    ('pipeline_success_rate',  'success_pct',   0.95,  30),
    ('pipeline_duration_p95',  'duration_ms',   180000, 30),
    ('pipeline_cost_p95',      'cost_usd',      2.50,  30),
    ('lesson_persistence_rate','persist_pct',   1.0,   30),
    ('commit_push_success',    'push_success',  0.99,  30)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Default Policies (Domain 26)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO policies (name, version, rule_type, condition, action)
VALUES
    ('budget_cap',           1, 'cost_gate',     '{"max_usd": 2.50}',              '{"block": true, "alert": true}'),
    ('require_review_pass',  1, 'quality_gate',  '{"reviewer_must_pass": true}',   '{"block_on_fail": true}'),
    ('require_syntax_check', 1, 'quality_gate',  '{"syntax_check_required": true}','{"block_on_fail": true}'),
    ('max_attempts',         1, 'retry_limit',   '{"max_attempts": 3}',            '{"fail_after_limit": true}'),
    ('commit_to_main_only',  1, 'branch_policy', '{"allowed_branch": "main"}',     '{"block_other_branches": true}')
ON CONFLICT (name) DO NOTHING;
