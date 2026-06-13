-- 009_memory_architecture.sql
-- Production-grade memory and learning architecture for Apex AI OS
-- 13 layers: Working → Episodic → Semantic → Procedural → Strategic → Skill → Decision
-- Plus: Knowledge Graph, Consolidation Queue, Reflexion Records, Improvement Candidates, Adaptation Cycles

-- ── LAYER 1: WORKING MEMORY ─────────────────────────────────────────────────
-- TTL-based, session-scoped, active reasoning state. Auto-expires.
CREATE TABLE IF NOT EXISTS working_memory (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id   TEXT UNIQUE NOT NULL,
    session_id  TEXT NOT NULL,
    trace_id    TEXT,
    task_id     TEXT,
    memory_type TEXT NOT NULL CHECK (memory_type IN (
        'active_task','active_goal','current_plan','execution_context','reasoning_state'
    )),
    content     JSONB NOT NULL,
    ttl_seconds INTEGER NOT NULL DEFAULT 3600,
    expires_at  TIMESTAMPTZ NOT NULL,
    confidence  DECIMAL(4,3) DEFAULT 1.0,
    source      TEXT DEFAULT 'orchestrator',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wm_session      ON working_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_wm_expires      ON working_memory(expires_at);
CREATE INDEX IF NOT EXISTS idx_wm_session_type ON working_memory(session_id, memory_type);

-- ── LAYER 2: EPISODIC MEMORY ─────────────────────────────────────────────────
-- Durable Postgres layer. Vault JSON files remain for offline/Obsidian access.
CREATE TABLE IF NOT EXISTS episodic_memory (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id        TEXT UNIQUE NOT NULL,
    trace_id         TEXT,
    task_id          TEXT,
    source           TEXT DEFAULT 'orchestrator',
    evidence         JSONB,
    objective        TEXT NOT NULL,
    complexity       TEXT CHECK (complexity IN ('trivial','simple','moderate','complex','critical')),
    success          BOOLEAN NOT NULL,
    outcome_summary  TEXT,
    cost_usd         DECIMAL(10,6),
    duration_ms      BIGINT,
    failed_stage     TEXT,
    failure_reason   TEXT,
    models_used      JSONB,
    keywords         TEXT[],
    lessons_derived  TEXT[],
    confidence       DECIMAL(4,3) DEFAULT 1.0,
    status           TEXT DEFAULT 'validated' CHECK (status IN ('candidate','validated','deprecated','superseded','archived')),
    validation_state TEXT DEFAULT 'auto_validated',
    embedding        VECTOR(768),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_em_success  ON episodic_memory(success);
CREATE INDEX IF NOT EXISTS idx_em_created  ON episodic_memory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_em_task     ON episodic_memory(task_id);
CREATE INDEX IF NOT EXISTS idx_em_status   ON episodic_memory(status);
CREATE INDEX IF NOT EXISTS idx_em_keywords ON episodic_memory USING GIN(keywords);

-- ── LAYER 3: SEMANTIC MEMORY ─────────────────────────────────────────────────
-- Validated facts, concepts, patterns, rules. What is true.
CREATE TABLE IF NOT EXISTS semantic_memory (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id            TEXT UNIQUE NOT NULL,
    trace_id             TEXT,
    source               TEXT NOT NULL,
    evidence             JSONB,
    fact                 TEXT NOT NULL,
    category             TEXT NOT NULL CHECK (category IN ('fact','concept','pattern','rule','constraint')),
    domain               TEXT,
    tags                 TEXT[],
    confidence           DECIMAL(4,3) NOT NULL DEFAULT 0.5,
    support_count        INTEGER DEFAULT 1,
    contradiction_count  INTEGER DEFAULT 0,
    superseded_by        TEXT,
    status               TEXT DEFAULT 'candidate' CHECK (status IN ('candidate','validated','deprecated','superseded','archived')),
    validation_state     TEXT DEFAULT 'pending' CHECK (validation_state IN ('pending','evidence_sufficient','validated','rejected')),
    embedding            VECTOR(768),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sm_category   ON semantic_memory(category);
CREATE INDEX IF NOT EXISTS idx_sm_domain     ON semantic_memory(domain);
CREATE INDEX IF NOT EXISTS idx_sm_status     ON semantic_memory(status);
CREATE INDEX IF NOT EXISTS idx_sm_confidence ON semantic_memory(confidence DESC);

-- ── LAYER 4: PROCEDURAL MEMORY ───────────────────────────────────────────────
-- Playbooks, workflows, recovery procedures. How we do this.
CREATE TABLE IF NOT EXISTS procedural_memory (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id            TEXT UNIQUE NOT NULL,
    trace_id             TEXT,
    source               TEXT NOT NULL,
    evidence             JSONB,
    name                 TEXT NOT NULL,
    procedure_type       TEXT NOT NULL CHECK (procedure_type IN ('playbook','workflow','recovery','implementation','checklist')),
    domain               TEXT,
    description          TEXT,
    steps                JSONB NOT NULL,
    preconditions        JSONB,
    postconditions       JSONB,
    triggers             TEXT[],
    success_rate         DECIMAL(4,3) DEFAULT 0.5,
    execution_count      INTEGER DEFAULT 0,
    last_failure_reason  TEXT,
    avg_duration_ms      BIGINT,
    confidence           DECIMAL(4,3) NOT NULL DEFAULT 0.5,
    status               TEXT DEFAULT 'candidate' CHECK (status IN ('candidate','validated','deprecated','superseded','archived')),
    validation_state     TEXT DEFAULT 'pending',
    embedding            VECTOR(768),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_type   ON procedural_memory(procedure_type);
CREATE INDEX IF NOT EXISTS idx_pm_domain ON procedural_memory(domain);
CREATE INDEX IF NOT EXISTS idx_pm_status ON procedural_memory(status);

-- ── LAYER 5: STRATEGIC MEMORY ────────────────────────────────────────────────
-- Goals, roadmaps, priorities, long-term direction. Where are we going.
CREATE TABLE IF NOT EXISTS strategic_memory (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id            TEXT UNIQUE NOT NULL,
    trace_id             TEXT,
    source               TEXT DEFAULT 'system',
    evidence             JSONB,
    title                TEXT NOT NULL,
    strategic_type       TEXT NOT NULL CHECK (strategic_type IN ('goal','roadmap','priority','direction','constraint','milestone')),
    content              JSONB NOT NULL,
    horizon              TEXT CHECK (horizon IN ('immediate','short_term','medium_term','long_term')),
    priority             INTEGER DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
    parent_id            TEXT,
    linked_projects      TEXT[],
    measurable_outcomes  JSONB,
    confidence           DECIMAL(4,3) NOT NULL DEFAULT 0.5,
    status               TEXT DEFAULT 'candidate' CHECK (status IN ('candidate','validated','deprecated','superseded','archived')),
    validation_state     TEXT DEFAULT 'pending',
    embedding            VECTOR(768),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stm_type     ON strategic_memory(strategic_type);
CREATE INDEX IF NOT EXISTS idx_stm_horizon  ON strategic_memory(horizon);
CREATE INDEX IF NOT EXISTS idx_stm_priority ON strategic_memory(priority DESC);
CREATE INDEX IF NOT EXISTS idx_stm_status   ON strategic_memory(status);

-- ── LAYER 6: SKILL MEMORY ────────────────────────────────────────────────────
-- Competency metrics, confidence levels, success/failure rates. What we're good at.
CREATE TABLE IF NOT EXISTS skill_memory (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id            TEXT UNIQUE NOT NULL,
    trace_id             TEXT,
    source               TEXT DEFAULT 'agent_reputation',
    evidence             JSONB,
    skill_name           TEXT NOT NULL UNIQUE,
    domain               TEXT NOT NULL,
    description          TEXT,
    competency_level     TEXT DEFAULT 'novice' CHECK (competency_level IN ('novice','developing','competent','proficient','expert')),
    confidence           DECIMAL(4,3) DEFAULT 0.5,
    success_rate         DECIMAL(4,3) DEFAULT 0.5,
    failure_rate         DECIMAL(4,3) DEFAULT 0.5,
    execution_count      INTEGER DEFAULT 0,
    recent_success_rate  DECIMAL(4,3),
    known_failure_modes  JSONB,
    improvement_areas    TEXT[],
    last_exercised_at    TIMESTAMPTZ,
    status               TEXT DEFAULT 'validated' CHECK (status IN ('candidate','validated','deprecated','superseded','archived')),
    validation_state     TEXT DEFAULT 'auto_validated',
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skm_domain      ON skill_memory(domain);
CREATE INDEX IF NOT EXISTS idx_skm_competency  ON skill_memory(competency_level);
CREATE INDEX IF NOT EXISTS idx_skm_confidence  ON skill_memory(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_skm_skill_name  ON skill_memory(skill_name);

-- ── LAYER 7: DECISION MEMORY ─────────────────────────────────────────────────
-- Decisions, alternatives, rationale, outcomes. How we make better decisions.
CREATE TABLE IF NOT EXISTS decision_memory (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id               TEXT UNIQUE NOT NULL,
    trace_id                TEXT,
    task_id                 TEXT,
    source                  TEXT NOT NULL,
    evidence                JSONB,
    decision                TEXT NOT NULL,
    decision_type           TEXT DEFAULT 'operational' CHECK (decision_type IN (
        'architectural','routing','model_selection','operational','strategic','recovery'
    )),
    context                 JSONB,
    alternatives_considered JSONB,
    rationale               TEXT NOT NULL,
    outcome                 TEXT,
    outcome_quality         TEXT CHECK (outcome_quality IN ('excellent','good','neutral','poor','catastrophic')),
    post_analysis           TEXT,
    confidence              DECIMAL(4,3) DEFAULT 0.5,
    influenced_by_lesson    TEXT,
    status                  TEXT DEFAULT 'candidate' CHECK (status IN ('candidate','validated','deprecated','superseded','archived')),
    validation_state        TEXT DEFAULT 'pending',
    embedding               VECTOR(768),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    resolved_at             TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_dm_type    ON decision_memory(decision_type);
CREATE INDEX IF NOT EXISTS idx_dm_quality ON decision_memory(outcome_quality);
CREATE INDEX IF NOT EXISTS idx_dm_task    ON decision_memory(task_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON decision_memory(created_at DESC);

-- ── LAYER 8: KNOWLEDGE GRAPH ─────────────────────────────────────────────────
-- Nodes and edges for relationship intelligence.
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id          TEXT UNIQUE NOT NULL,
    node_type        TEXT NOT NULL CHECK (node_type IN (
        'Goal','Project','Task','Episode','Lesson','Skill','Decision',
        'Procedure','Incident','Knowledge','Certification','Pattern'
    )),
    label            TEXT NOT NULL,
    properties       JSONB DEFAULT '{}',
    source_memory_id TEXT,
    source_table     TEXT,
    confidence       DECIMAL(4,3) DEFAULT 0.5,
    status           TEXT DEFAULT 'active' CHECK (status IN ('active','deprecated','archived')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kgn_type   ON knowledge_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_kgn_status ON knowledge_graph_nodes(status);

CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id      TEXT UNIQUE NOT NULL,
    from_node_id TEXT NOT NULL REFERENCES knowledge_graph_nodes(node_id) ON DELETE CASCADE,
    to_node_id   TEXT NOT NULL REFERENCES knowledge_graph_nodes(node_id) ON DELETE CASCADE,
    relationship TEXT NOT NULL CHECK (relationship IN (
        'CAUSED','GENERATED','SUPPORTS','IMPROVES','DERIVED_FROM',
        'SOLVES','CONTRIBUTES_TO','SUPERSEDES','VALIDATES','CONTRADICTS','RELATES_TO'
    )),
    evidence     JSONB,
    confidence   DECIMAL(4,3) DEFAULT 0.5,
    weight       DECIMAL(5,3) DEFAULT 1.0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kge_from ON knowledge_graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_kge_to   ON knowledge_graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_kge_rel  ON knowledge_graph_edges(relationship);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kge_unique ON knowledge_graph_edges(from_node_id, to_node_id, relationship);

-- ── MEMORY CONSOLIDATION QUEUE ───────────────────────────────────────────────
-- Pipeline: Raw Observations → Reflections → Lessons → Patterns → Knowledge
CREATE TABLE IF NOT EXISTS memory_consolidation_queue (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id            TEXT UNIQUE NOT NULL,
    source_type         TEXT NOT NULL CHECK (source_type IN (
        'raw_observation','reflection','lesson','pattern','episode','decision'
    )),
    source_id           TEXT NOT NULL,
    content             JSONB NOT NULL,
    consolidation_stage TEXT DEFAULT 'raw' CHECK (consolidation_stage IN (
        'raw','reflected','classified','validated','promoted','rejected'
    )),
    target_memory_type  TEXT,
    priority            INTEGER DEFAULT 50,
    attempts            INTEGER DEFAULT 0,
    assigned_at         TIMESTAMPTZ DEFAULT NOW(),
    processed_at        TIMESTAMPTZ,
    result_memory_id    TEXT,
    error               TEXT
);
CREATE INDEX IF NOT EXISTS idx_mcq_stage    ON memory_consolidation_queue(consolidation_stage);
CREATE INDEX IF NOT EXISTS idx_mcq_priority ON memory_consolidation_queue(priority DESC, assigned_at ASC);

-- ── REFLEXION RECORDS ────────────────────────────────────────────────────────
-- Closed-loop verification: did this lesson actually change behavior?
CREATE TABLE IF NOT EXISTS reflexion_records (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reflexion_id             TEXT UNIQUE NOT NULL,
    trace_id                 TEXT,
    task_id                  TEXT,
    episode_memory_id        TEXT,
    lesson_text              TEXT NOT NULL,
    lesson_source            TEXT,
    validation_evidence      JSONB,
    behavior_change_verified BOOLEAN DEFAULT FALSE,
    influenced_decisions     INTEGER DEFAULT 0,
    influenced_executions    INTEGER DEFAULT 0,
    retrieval_count          INTEGER DEFAULT 0,
    first_applied_at         TIMESTAMPTZ,
    last_applied_at          TIMESTAMPTZ,
    status                   TEXT DEFAULT 'pending' CHECK (status IN (
        'pending','validated','applied','superseded','rejected'
    )),
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rr_status          ON reflexion_records(status);
CREATE INDEX IF NOT EXISTS idx_rr_behavior_change ON reflexion_records(behavior_change_verified);

-- ── IMPROVEMENT CANDIDATES ───────────────────────────────────────────────────
-- Closed-loop: Observation → Candidate → Risk Assessment → Approval → Deployment → Validation
CREATE TABLE IF NOT EXISTS improvement_candidates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id        TEXT UNIQUE NOT NULL,
    trace_id            TEXT,
    source_observation  TEXT NOT NULL,
    source_lesson_id    TEXT,
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    improvement_type    TEXT NOT NULL CHECK (improvement_type IN (
        'routing','planning','model_selection','retry_strategy','prompt','procedure','threshold','timeout'
    )),
    risk_level          TEXT DEFAULT 'low' CHECK (risk_level IN ('minimal','low','medium','high','critical')),
    estimated_impact    DECIMAL(4,3) DEFAULT 0.0,
    risk_assessment     JSONB,
    implementation_spec JSONB,
    approval_status     TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','deferred')),
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,
    deployed_at         TIMESTAMPTZ,
    deployment_evidence JSONB,
    validation_result   JSONB,
    validated_at        TIMESTAMPTZ,
    status              TEXT DEFAULT 'candidate' CHECK (status IN (
        'candidate','approved','deployed','validated','rejected','superseded'
    )),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ic_status ON improvement_candidates(status);
CREATE INDEX IF NOT EXISTS idx_ic_risk   ON improvement_candidates(risk_level);
CREATE INDEX IF NOT EXISTS idx_ic_type   ON improvement_candidates(improvement_type);

-- ── ADAPTATION CYCLES ────────────────────────────────────────────────────────
-- Weekly cycle: Lessons → Patterns → Knowledge → Policy Changes → Behavior Changes
CREATE TABLE IF NOT EXISTS adaptation_cycles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id            TEXT UNIQUE NOT NULL,
    cycle_type          TEXT DEFAULT 'weekly' CHECK (cycle_type IN ('weekly','triggered','emergency','manual')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    lessons_analyzed    INTEGER DEFAULT 0,
    patterns_discovered INTEGER DEFAULT 0,
    knowledge_updated   INTEGER DEFAULT 0,
    skills_updated      INTEGER DEFAULT 0,
    policy_changes      JSONB DEFAULT '[]',
    routing_changes     JSONB DEFAULT '[]',
    behavior_changes    JSONB DEFAULT '[]',
    measurable_outcomes JSONB DEFAULT '{}',
    status              TEXT DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
    error               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ac_status  ON adaptation_cycles(status);
CREATE INDEX IF NOT EXISTS idx_ac_started ON adaptation_cycles(started_at DESC);

-- ── SEARCH FUNCTIONS ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_episodic_memory(
    query_embedding      VECTOR(768),
    similarity_threshold FLOAT DEFAULT 0.5,
    max_results          INT DEFAULT 10,
    success_only         BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    memory_id  TEXT,
    objective  TEXT,
    success    BOOLEAN,
    confidence DECIMAL,
    similarity FLOAT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT em.memory_id, em.objective, em.success, em.confidence,
           1 - (em.embedding <=> query_embedding) AS similarity,
           em.created_at
    FROM   episodic_memory em
    WHERE  em.embedding IS NOT NULL
      AND  em.status = 'validated'
      AND  (NOT success_only OR em.success = TRUE)
      AND  1 - (em.embedding <=> query_embedding) >= similarity_threshold
    ORDER  BY em.embedding <=> query_embedding
    LIMIT  max_results;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_semantic_memory(
    query_embedding      VECTOR(768),
    category_filter      TEXT DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.5,
    max_results          INT DEFAULT 10
)
RETURNS TABLE (
    memory_id  TEXT,
    fact       TEXT,
    category   TEXT,
    confidence DECIMAL,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT sm.memory_id, sm.fact, sm.category, sm.confidence,
           1 - (sm.embedding <=> query_embedding) AS similarity
    FROM   semantic_memory sm
    WHERE  sm.embedding IS NOT NULL
      AND  sm.status IN ('candidate','validated')
      AND  (category_filter IS NULL OR sm.category = category_filter)
      AND  1 - (sm.embedding <=> query_embedding) >= similarity_threshold
    ORDER  BY sm.embedding <=> query_embedding
    LIMIT  max_results;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_decision_memory(
    query_embedding      VECTOR(768),
    similarity_threshold FLOAT DEFAULT 0.45,
    max_results          INT DEFAULT 8
)
RETURNS TABLE (
    memory_id      TEXT,
    decision       TEXT,
    decision_type  TEXT,
    outcome_quality TEXT,
    confidence     DECIMAL,
    similarity     FLOAT,
    created_at     TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT dm.memory_id, dm.decision, dm.decision_type, dm.outcome_quality,
           dm.confidence, 1 - (dm.embedding <=> query_embedding) AS similarity,
           dm.created_at
    FROM   decision_memory dm
    WHERE  dm.embedding IS NOT NULL
      AND  dm.status IN ('candidate','validated')
      AND  1 - (dm.embedding <=> query_embedding) >= similarity_threshold
    ORDER  BY dm.embedding <=> query_embedding
    LIMIT  max_results;
END;
$$ LANGUAGE plpgsql;
