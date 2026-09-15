-- 010_intelligence_layer.sql
-- Intelligence layer support tables for Apex AI OS
-- Knowledge validation, contradiction reports, retrieval audit, learning reports, lifecycle scoring

-- ── KNOWLEDGE VALIDATION QUEUE ───────────────────────────────────────────────
-- Lessons queue for promotion to validated semantic knowledge.
-- No lesson becomes knowledge without passing through here.
CREATE TABLE IF NOT EXISTS knowledge_validation_queue (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id     TEXT UNIQUE NOT NULL,
    lesson_text       TEXT NOT NULL,
    lesson_source_id  TEXT,           -- apex_lessons.id or reflexion_records.reflexion_id
    trace_id          TEXT,
    task_id           TEXT,
    source_type       TEXT DEFAULT 'lesson' CHECK (source_type IN ('lesson','observation','pattern','reflection')),
    confirmations     INTEGER DEFAULT 0,
    min_confirmations INTEGER DEFAULT 2,
    confidence        DECIMAL(4,3) DEFAULT 0.0,
    min_confidence    DECIMAL(4,3) DEFAULT 0.60,
    evidence          JSONB DEFAULT '[]',
    contradictions    JSONB DEFAULT '[]',
    graph_edges       JSONB DEFAULT '[]',
    status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirming','validated','rejected','superseded')),
    result_memory_id  TEXT,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kvq_status    ON knowledge_validation_queue(status);
CREATE INDEX IF NOT EXISTS idx_kvq_source_id ON knowledge_validation_queue(lesson_source_id);
CREATE INDEX IF NOT EXISTS idx_kvq_task      ON knowledge_validation_queue(task_id);

-- ── CONTRADICTION REPORTS ────────────────────────────────────────────────────
-- Detected conflicts between knowledge objects. Nothing is silently overwritten.
CREATE TABLE IF NOT EXISTS contradiction_reports (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id          TEXT UNIQUE NOT NULL,
    contradiction_type TEXT NOT NULL CHECK (contradiction_type IN ('knowledge','procedure','decision','policy','lesson')),
    severity           TEXT DEFAULT 'low' CHECK (severity IN ('info','low','medium','high','critical')),
    memory_a_id        TEXT NOT NULL,
    memory_a_table     TEXT NOT NULL,
    memory_b_id        TEXT NOT NULL,
    memory_b_table     TEXT NOT NULL,
    description        TEXT NOT NULL,
    evidence           JSONB,
    similarity_score   DECIMAL(4,3),
    confidence_a       DECIMAL(4,3),
    confidence_b       DECIMAL(4,3),
    recommendation     TEXT CHECK (recommendation IN ('supersede_a','supersede_b','deprecate_a','deprecate_b','flag_review','merge','ignore')),
    resolution_status  TEXT DEFAULT 'open' CHECK (resolution_status IN ('open','resolved','ignored','deferred')),
    resolution_notes   TEXT,
    resolved_by        TEXT,
    resolved_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cr_type         ON contradiction_reports(contradiction_type);
CREATE INDEX IF NOT EXISTS idx_cr_severity     ON contradiction_reports(severity);
CREATE INDEX IF NOT EXISTS idx_cr_status       ON contradiction_reports(resolution_status);
CREATE INDEX IF NOT EXISTS idx_cr_memory_a     ON contradiction_reports(memory_a_id);
CREATE INDEX IF NOT EXISTS idx_cr_memory_b     ON contradiction_reports(memory_b_id);

-- ── RETRIEVAL AUDIT LOG ──────────────────────────────────────────────────────
-- Audit trail for every memory retrieval. Enables analysis of retrieval quality.
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id               TEXT UNIQUE NOT NULL,
    trace_id             TEXT,
    task_id              TEXT,
    objective_hash       TEXT,
    sources_queried      TEXT[],
    total_retrieved      INTEGER DEFAULT 0,
    episodes_retrieved   INTEGER DEFAULT 0,
    lessons_retrieved    INTEGER DEFAULT 0,
    decisions_retrieved  INTEGER DEFAULT 0,
    procedures_retrieved INTEGER DEFAULT 0,
    knowledge_retrieved  INTEGER DEFAULT 0,
    graph_nodes_retrieved INTEGER DEFAULT 0,
    context_chars_used   INTEGER DEFAULT 0,
    overall_confidence   DECIMAL(4,3),
    retrieval_method     TEXT,
    duration_ms          INTEGER,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rl_trace   ON retrieval_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_rl_created ON retrieval_logs(created_at DESC);

-- ── LEARNING REPORTS ─────────────────────────────────────────────────────────
-- Weekly, monthly, and quarterly organizational learning reports.
CREATE TABLE IF NOT EXISTS learning_reports (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id      TEXT UNIQUE NOT NULL,
    report_type    TEXT NOT NULL CHECK (report_type IN ('weekly','monthly','quarterly','incident','skills')),
    period_start   TIMESTAMPTZ NOT NULL,
    period_end     TIMESTAMPTZ NOT NULL,
    title          TEXT NOT NULL,
    content        TEXT NOT NULL,
    key_insights   JSONB DEFAULT '[]',
    metrics        JSONB DEFAULT '{}',
    published_to   TEXT[] DEFAULT '{}',
    obsidian_path  TEXT,
    notion_page_id TEXT,
    slack_ts       TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lr_type    ON learning_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_lr_period  ON learning_reports(period_start DESC);

-- ── MEMORY TEMPERATURE SCORES ────────────────────────────────────────────────
-- Lifecycle scoring: hot / warm / cold / archive per memory object.
CREATE TABLE IF NOT EXISTS memory_temperature_scores (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id            TEXT NOT NULL,
    memory_table         TEXT NOT NULL,
    temperature_score    DECIMAL(4,3) NOT NULL,
    tier                 TEXT NOT NULL CHECK (tier IN ('hot','warm','cold','archive')),
    recency_score        DECIMAL(4,3),
    usage_score          DECIMAL(4,3),
    confidence_score     DECIMAL(4,3),
    impact_score         DECIMAL(4,3),
    graph_connectivity   DECIMAL(4,3),
    computed_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (memory_id, memory_table)
);
CREATE INDEX IF NOT EXISTS idx_mts_table ON memory_temperature_scores(memory_table);
CREATE INDEX IF NOT EXISTS idx_mts_tier  ON memory_temperature_scores(tier);
CREATE INDEX IF NOT EXISTS idx_mts_score ON memory_temperature_scores(temperature_score DESC);

-- ── SKILL EVOLUTION SNAPSHOTS ────────────────────────────────────────────────
-- Weekly snapshots of all skill states for trend analysis.
CREATE TABLE IF NOT EXISTS skill_evolution_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_id     TEXT UNIQUE NOT NULL,
    skill_name      TEXT NOT NULL,
    domain          TEXT NOT NULL,
    snapshot_date   DATE NOT NULL,
    competency_level TEXT,
    confidence      DECIMAL(4,3),
    success_rate    DECIMAL(4,3),
    execution_count INTEGER,
    trend           TEXT CHECK (trend IN ('improving','stable','declining','new','lost')),
    trend_delta     DECIMAL(4,3),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ses_skill  ON skill_evolution_snapshots(skill_name);
CREATE INDEX IF NOT EXISTS idx_ses_date   ON skill_evolution_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ses_trend  ON skill_evolution_snapshots(trend);
