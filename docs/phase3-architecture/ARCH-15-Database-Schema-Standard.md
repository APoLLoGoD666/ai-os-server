# APEX CIVILISATION — ARCH-15: Database Schema Standard

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Standard
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00, ARCH-01, ARCH-04, ARCH-05, ARCH-08, ARCH-10, ARCH-11, ARCH-12, ARCH-14
**Depended on by:** (none — terminal document in Phase 3 series)

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document defines the database schema standard for the APEX Civilisation's Supabase Postgres instance: naming conventions, mandatory columns, required indexes, Row Level Security (RLS) policy rules, migration protocol, and the physical schemas for all tables introduced by the Phase 3 architecture series.

It consolidates the table obligations scattered across ARCH-05 (SOT references), ARCH-08 (audit records), ARCH-10 (memory types), ARCH-11 (event log), ARCH-12 (task record), and ARCH-14 (sessions, resource consumption) into a single physical schema authority.

### 1.2 Scope

Covered: naming conventions; mandatory column set; RLS policy rules; migration protocol; physical table schemas for all Phase 3 tables; index obligations; foreign key and nullability conventions; forbidden schema patterns.

Not covered: Supabase Storage bucket configuration; read replica configuration; connection pooling settings; Supabase project settings.

---

## Section 2 — Naming Conventions

### 2.1 Table Names

- **Format:** `snake_case`, plural noun
- **Prefix:** None — no application prefix on table names; Postgres schemas (`public`, `audit`, `memory`) provide namespace separation
- **Examples:** `tasks`, `events`, `governance_records`, `reflexion_records`, `episodic_memory`
- **Forbidden:** CamelCase, hyphenated names, abbreviated names that require a glossary

### 2.2 Column Names

- **Format:** `snake_case`
- **Boolean columns:** prefix `is_` or `has_` (e.g., `is_active`, `has_constitutional_impact`)
- **Timestamp columns:** suffix `_at` (e.g., `created_at`, `approved_at`, `expires_at`)
- **Foreign key columns:** `{referenced_table_singular}_id` (e.g., `task_id`, `session_id`)
- **JSONB snapshot columns:** suffix `_snapshot` when the JSONB is a denormalised copy for audit purposes (e.g., `actor_identity_snapshot`)

### 2.3 Index Names

- **Format:** `idx_{table}_{columns}` (e.g., `idx_tasks_status`, `idx_events_idempotency_key`)
- **Unique indexes:** `uidx_{table}_{columns}` (e.g., `uidx_events_idempotency_key`)
- **Partial indexes:** append `_where_{condition_summary}` (e.g., `idx_tasks_status_where_active`)

### 2.4 Constraint Names

- **Primary keys:** `{table}_pkey` (Postgres default; do not override)
- **Unique constraints:** `{table}_{columns}_unique`
- **Check constraints:** `{table}_{description}_check`
- **Foreign keys:** `{table}_{column}_fkey`

---

## Section 3 — Mandatory Columns

Every table in the APEX Civilisation Supabase instance must include the following columns unless explicitly noted as exempt in the table's schema section.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid DEFAULT gen_random_uuid()` | Primary key; UUID v4 |
| `created_at` | `timestamptz DEFAULT now() NOT NULL` | Row creation timestamp |
| `updated_at` | `timestamptz DEFAULT now() NOT NULL` | Last update timestamp; maintained by trigger |

**`updated_at` trigger:** A Postgres trigger function `set_updated_at()` must be applied to every governed table. It sets `NEW.updated_at = now()` on every UPDATE.

**Exempt tables:** Append-only tables (event log, audit records, resource_consumption) are exempt from `updated_at` because rows are never updated after insert.

---

## Section 4 — Row Level Security Policy Rules

### 4.1 RLS Obligation

Row Level Security must be enabled on every table in the `public` schema. A table without RLS is a trust boundary violation (ARCH-06 TB-001).

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
```

### 4.2 Policy Pattern

All RLS policies follow the attribute-based access pattern using the Supabase `auth.uid()` function and a `user_id` or `owner_id` column that references the authenticated user.

**For tables with a `session_id` column:**
```sql
CREATE POLICY "{table}_session_isolation"
  ON {table_name}
  FOR ALL
  USING (session_id = auth.uid()::uuid);
```

**For tables with a `planned_by` or `actor_identity_snapshot` JSONB column:**
```sql
CREATE POLICY "{table}_owner_access"
  ON {table_name}
  FOR ALL
  USING ((planned_by ->> 'user_id')::uuid = auth.uid()::uuid);
```

**For append-only audit and event tables (read access only for authenticated users):**
```sql
CREATE POLICY "{table}_read_own"
  ON {table_name}
  FOR SELECT
  USING ((emitted_by ->> 'user_id')::uuid = auth.uid()::uuid);
```

**Service role bypass:** The Supabase service role (used by the server-side application) bypasses RLS by default. Application-level access control (ARCH-04 identity checks, ARCH-06 trust boundaries) must enforce authority limits on the service role path.

### 4.3 Forbidden RLS Patterns

- `FOR ALL USING (true)` — opens the table to all authenticated users; prohibited
- No RLS policy at all — prohibited; use `RESTRICT` if unsure
- RLS disabled on any governed table — prohibited

---

## Section 5 — Migration Protocol

### 5.1 Migration File Naming

Migration files must be named: `{YYYYMMDD}_{sequence}_{description}.sql`

Examples:
- `20260702_001_create_events_table.sql`
- `20260702_002_create_tasks_table.sql`
- `20260702_003_add_rls_events.sql`

Sequence is zero-padded to 3 digits within a single date. Multiple migrations on the same date use incrementing sequence numbers.

### 5.2 Migration Obligations

Every migration file must:
1. Begin with a transaction: `BEGIN;`
2. Include a rollback section commented as `-- ROLLBACK: <inverse operation>`
3. End with `COMMIT;`
4. Include a migration record insert: `INSERT INTO schema_migrations (migration_id, applied_at) VALUES ('{filename}', now());`
5. Be idempotent where possible (use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)

### 5.3 Forbidden Migration Patterns

- `DROP TABLE` without EXECUTIVE approval Governance Record reference in the migration comment
- `ALTER TABLE ... DROP COLUMN` without EXECUTIVE approval
- Removing an index that is referenced in ARCH documents as a required index
- Adding a NOT NULL column to an existing table without a DEFAULT value (will fail on non-empty tables)
- `TRUNCATE TABLE` on any governed table

### 5.4 Schema Migrations Table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_id  text PRIMARY KEY,
  applied_at    timestamptz NOT NULL DEFAULT now()
);
```

This table is exempt from the mandatory columns requirement (it is a metadata table, not a governed entity table).

---

## Section 6 — Physical Table Schemas

### 6.1 `tasks` Table (SOT-002, ARCH-12)

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id                          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id                     uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  task_type                   text NOT NULL CHECK (task_type IN ('FEATURE','BUG_FIX','REFACTOR','RESEARCH','MAINTENANCE')),
  description                 text NOT NULL,
  planned_by                  jsonb NOT NULL,
  planned_at                  timestamptz NOT NULL DEFAULT now(),
  approved_by                 jsonb,
  approved_at                 timestamptz,
  autonomy_level_at_approval  integer CHECK (autonomy_level_at_approval BETWEEN 1 AND 6),
  queued_at                   timestamptz,
  queue_position              integer,
  executing_at                timestamptz,
  budget_reserved_usd         numeric(10,6),
  step_log                    jsonb[] NOT NULL DEFAULT '{}',
  actual_cost_usd             numeric(10,6),
  outputs                     jsonb,
  lesson_id                   uuid,
  failed_at                   timestamptz,
  failure_reason              text,
  last_successful_step        integer,
  cancelled_at                timestamptz,
  cancelled_by                jsonb,
  cancellation_reason         text,
  force_terminated_at         timestamptz,
  terminated_by               jsonb,
  termination_reason          text,
  status                      text NOT NULL DEFAULT 'PLANNED'
                                CHECK (status IN ('PLANNED','APPROVED','QUEUED','EXECUTING','COMPLETED','FAILED','CANCELLED','FORCE_TERMINATED')),
  governance_record_id        uuid,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_at ON tasks(planned_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status_where_active
  ON tasks(status, planned_at DESC)
  WHERE status IN ('PLANNED','APPROVED','QUEUED','EXECUTING');

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### 6.2 `events` Table (SOT-008, ARCH-11)

```sql
CREATE TABLE IF NOT EXISTS events (
  event_id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type          text NOT NULL,
  entity_type         text NOT NULL,
  entity_id           uuid,
  emitted_by          jsonb NOT NULL,
  content_hash        text NOT NULL,
  idempotency_key     text NOT NULL,
  emitted_at          timestamptz NOT NULL DEFAULT now(),
  correlation_id      uuid,
  schema_version      text NOT NULL,
  persistence_class   text NOT NULL CHECK (persistence_class IN ('GOVERNED','OBSERVABILITY')),
  payload             jsonb NOT NULL,
  dispatched_at       timestamptz,
  consumer_ack_count  integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only table
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_events_idempotency_key ON events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_entity_id ON events(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_emitted_at ON events(emitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

### 6.3 `governance_records` Table (SOT-005, ARCH-08)

```sql
CREATE TABLE IF NOT EXISTS governance_records (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id                 uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  record_type               text NOT NULL,
  actor_identity_snapshot   jsonb NOT NULL,
  action_type               text NOT NULL,
  entity_type               text NOT NULL,
  entity_id                 uuid,
  decision                  text NOT NULL CHECK (decision IN ('APPROVED','REJECTED','NOTED','BLOCKED')),
  decision_basis            text NOT NULL,
  evidence_refs             jsonb NOT NULL DEFAULT '[]',
  autonomy_level            integer NOT NULL CHECK (autonomy_level BETWEEN 1 AND 6),
  has_constitutional_impact boolean NOT NULL DEFAULT false,
  chain_link                uuid,
  chain_hash                text NOT NULL,
  predecessor_hash          text,
  gate_result               text CHECK (gate_result IN ('PASS','BLOCK')),
  governance_score          numeric(5,2),
  rule_results              jsonb,
  created_at                timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only
);

CREATE INDEX IF NOT EXISTS idx_governance_records_entity_id ON governance_records(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_governance_records_record_type ON governance_records(record_type);
CREATE INDEX IF NOT EXISTS idx_governance_records_created_at ON governance_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_records_chain_link ON governance_records(chain_link) WHERE chain_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_governance_records_constitutional
  ON governance_records(created_at DESC)
  WHERE has_constitutional_impact = true;

ALTER TABLE governance_records ENABLE ROW LEVEL SECURITY;
```

### 6.4 `reflexion_records` Table (SOT-003, ARCH-10)

```sql
CREATE TABLE IF NOT EXISTS reflexion_records (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id           uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  task_id             uuid NOT NULL REFERENCES tasks(task_id),
  lesson_title        text NOT NULL,
  lesson_body         text NOT NULL,
  lesson_type         text NOT NULL CHECK (lesson_type IN ('SUCCESS','FAILURE','PARTIAL','INSIGHT')),
  applicable_contexts text[] NOT NULL DEFAULT '{}',
  semantic_tags       text[] NOT NULL DEFAULT '{}',
  confidence_score    numeric(4,3) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  content_embedding   vector(1536),
  obsidian_path       text,
  created_at          timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only
);

CREATE INDEX IF NOT EXISTS idx_reflexion_records_task_id ON reflexion_records(task_id);
CREATE INDEX IF NOT EXISTS idx_reflexion_records_lesson_type ON reflexion_records(lesson_type);
CREATE INDEX IF NOT EXISTS idx_reflexion_records_created_at ON reflexion_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reflexion_records_embedding
  ON reflexion_records USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE reflexion_records ENABLE ROW LEVEL SECURITY;
```

### 6.5 `sessions` Table (SOT-004, ARCH-14)

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id            uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  user_id               uuid NOT NULL,
  identity_snapshot     jsonb NOT NULL,
  effective_trust_level integer NOT NULL CHECK (effective_trust_level BETWEEN 1 AND 6),
  status                text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','TERMINATED')),
  working_context       jsonb NOT NULL DEFAULT '{}',
  turn_count            integer NOT NULL DEFAULT 0,
  cumulative_cost_usd   numeric(10,6) NOT NULL DEFAULT 0,
  expires_at            timestamptz NOT NULL,
  terminated_at         timestamptz,
  termination_reason    text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at) WHERE status = 'ACTIVE';

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_user_isolation"
  ON sessions FOR ALL
  USING (user_id = auth.uid()::uuid);
```

### 6.6 `resource_consumption` Table (SOT-006, ARCH-05)

```sql
CREATE TABLE IF NOT EXISTS resource_consumption (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id       uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  task_id         uuid REFERENCES tasks(task_id),
  session_id      uuid REFERENCES sessions(session_id),
  request_id      uuid NOT NULL,
  resource_type   text NOT NULL CHECK (resource_type IN ('MODEL_TOKENS','RESERVATION','RELEASE','OVERAGE')),
  model_tier      text,
  input_tokens    integer,
  output_tokens   integer,
  cost_usd        numeric(10,6) NOT NULL,
  is_reservation  boolean NOT NULL DEFAULT false,
  is_release      boolean NOT NULL DEFAULT false,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only
);

CREATE INDEX IF NOT EXISTS idx_resource_consumption_task_id ON resource_consumption(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_consumption_session_id ON resource_consumption(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resource_consumption_recorded_at ON resource_consumption(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_consumption_resource_type ON resource_consumption(resource_type);

ALTER TABLE resource_consumption ENABLE ROW LEVEL SECURITY;
```

### 6.7 `audit_records` Table (ARCH-08)

```sql
CREATE TABLE IF NOT EXISTS audit_records (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id                  uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  operation_class           text NOT NULL,
  action_name               text NOT NULL,
  actor_identity_snapshot   jsonb NOT NULL,
  entity_type               text NOT NULL,
  entity_id                 uuid,
  outcome                   text NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE','BLOCKED','PARTIAL')),
  outcome_detail            text,
  evidence_refs             jsonb NOT NULL DEFAULT '[]',
  has_constitutional_impact boolean NOT NULL DEFAULT false,
  chain_link                uuid,
  chain_hash                text NOT NULL,
  predecessor_hash          text,
  request_id                uuid,
  correlation_id            uuid,
  recorded_at               timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only
);

CREATE INDEX IF NOT EXISTS idx_audit_records_entity_id ON audit_records(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_records_operation_class ON audit_records(operation_class);
CREATE INDEX IF NOT EXISTS idx_audit_records_recorded_at ON audit_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_records_chain_link ON audit_records(chain_link) WHERE chain_link IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_records_constitutional
  ON audit_records(recorded_at DESC)
  WHERE has_constitutional_impact = true;

ALTER TABLE audit_records ENABLE ROW LEVEL SECURITY;
```

### 6.8 Memory Tables (ARCH-10)

**`episodic_memory` table:**
```sql
CREATE TABLE IF NOT EXISTS episodic_memory (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id           uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  session_id          uuid REFERENCES sessions(session_id),
  task_id             uuid REFERENCES tasks(task_id),
  event_type          text NOT NULL,
  entity_refs         uuid[] NOT NULL DEFAULT '{}',
  summary             text NOT NULL,
  outcome             text NOT NULL CHECK (outcome IN ('SUCCESS','FAILURE','PARTIAL','INSIGHT')),
  emotional_valence   text CHECK (emotional_valence IN ('POSITIVE','NEUTRAL','NEGATIVE')),
  semantic_tags       text[] NOT NULL DEFAULT '{}',
  content_embedding   vector(1536),
  consolidation_score numeric(4,3) NOT NULL DEFAULT 0,
  is_consolidated     boolean NOT NULL DEFAULT false,
  occurred_at         timestamptz NOT NULL,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episodic_memory_session_id ON episodic_memory(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_episodic_memory_occurred_at ON episodic_memory(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodic_memory_embedding
  ON episodic_memory USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);
ALTER TABLE episodic_memory ENABLE ROW LEVEL SECURITY;
```

**`semantic_memory` table:**
```sql
CREATE TABLE IF NOT EXISTS semantic_memory (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id           uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  concept_name        text NOT NULL,
  concept_type        text NOT NULL,
  content             text NOT NULL,
  source_refs         uuid[] NOT NULL DEFAULT '{}',
  confidence_score    numeric(4,3) NOT NULL DEFAULT 1.0,
  semantic_tags       text[] NOT NULL DEFAULT '{}',
  content_embedding   vector(1536),
  version             integer NOT NULL DEFAULT 1,
  supersedes_id       uuid REFERENCES semantic_memory(memory_id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_semantic_memory_concept_name ON semantic_memory(concept_name);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_concept_type ON semantic_memory(concept_type);
CREATE INDEX IF NOT EXISTS idx_semantic_memory_embedding
  ON semantic_memory USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);
ALTER TABLE semantic_memory ENABLE ROW LEVEL SECURITY;
```

**`procedural_memory` table:**
```sql
CREATE TABLE IF NOT EXISTS procedural_memory (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id           uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  procedure_name      text NOT NULL,
  task_types          text[] NOT NULL DEFAULT '{}',
  steps               jsonb NOT NULL,
  preconditions       jsonb NOT NULL DEFAULT '[]',
  expected_outcomes   jsonb NOT NULL DEFAULT '[]',
  success_count       integer NOT NULL DEFAULT 0,
  failure_count       integer NOT NULL DEFAULT 0,
  last_used_at        timestamptz,
  content_embedding   vector(1536),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedural_memory_task_types ON procedural_memory USING GIN(task_types);
CREATE INDEX IF NOT EXISTS idx_procedural_memory_embedding
  ON procedural_memory USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);
ALTER TABLE procedural_memory ENABLE ROW LEVEL SECURITY;
```

**`strategic_memory` table (SOT-001, replaces goal-tracker.js as authoritative):**
```sql
CREATE TABLE IF NOT EXISTS strategic_memory (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id           uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  memory_type         text NOT NULL CHECK (memory_type IN ('GOAL','OBJECTIVE','CONSTRAINT','PRINCIPLE','DECISION')),
  title               text NOT NULL,
  content             text NOT NULL,
  status              text NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','IN_PROGRESS','COMPLETED','SUSPENDED','ARCHIVED')),
  parent_id           uuid REFERENCES strategic_memory(memory_id),
  priority            integer NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  target_date         timestamptz,
  completed_at        timestamptz,
  content_embedding   vector(1536),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategic_memory_memory_type ON strategic_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_strategic_memory_status ON strategic_memory(status);
CREATE INDEX IF NOT EXISTS idx_strategic_memory_parent_id ON strategic_memory(parent_id) WHERE parent_id IS NOT NULL;
ALTER TABLE strategic_memory ENABLE ROW LEVEL SECURITY;
```

**`skill_metrics` table (SOT-010):**
```sql
CREATE TABLE IF NOT EXISTS skill_metrics (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id                uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  skill_name              text NOT NULL UNIQUE,
  skill_category          text NOT NULL,
  proficiency_score       numeric(4,3) NOT NULL DEFAULT 0.5 CHECK (proficiency_score BETWEEN 0 AND 1),
  task_count              integer NOT NULL DEFAULT 0,
  success_count           integer NOT NULL DEFAULT 0,
  failure_count           integer NOT NULL DEFAULT 0,
  last_used_at            timestamptz,
  co_activation_refs      uuid[] NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_metrics_skill_category ON skill_metrics(skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_metrics_proficiency ON skill_metrics(proficiency_score DESC);
ALTER TABLE skill_metrics ENABLE ROW LEVEL SECURITY;
```

### 6.9 Knowledge Graph Tables (ARCH-13)

```sql
CREATE TABLE IF NOT EXISTS knowledge_graph_nodes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id       uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  node_type     text NOT NULL CHECK (node_type IN ('CONCEPT','ENTITY','SKILL','DECISION')),
  label         text NOT NULL,
  content_hash  text NOT NULL,
  source_ref    uuid,
  source_table  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_graph_nodes_node_type ON knowledge_graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_nodes_label ON knowledge_graph_nodes(label);
ALTER TABLE knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS knowledge_graph_edges (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  edge_id         uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  from_node_id    uuid NOT NULL REFERENCES knowledge_graph_nodes(node_id),
  to_node_id      uuid NOT NULL REFERENCES knowledge_graph_nodes(node_id),
  relationship    text NOT NULL CHECK (relationship IN ('RELATES_TO','DEPENDS_ON','TAUGHT_BY','CO_ACTIVATED_WITH','LEADS_TO','CONTRADICTS','SUPERSEDES')),
  weight          numeric(4,3) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 1),
  source_ref      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: edges are append-only; weight updates create new edges
);

CREATE INDEX IF NOT EXISTS idx_knowledge_graph_edges_from_node ON knowledge_graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_edges_to_node ON knowledge_graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graph_edges_relationship ON knowledge_graph_edges(relationship);
CREATE UNIQUE INDEX IF NOT EXISTS uidx_knowledge_graph_edges_pair
  ON knowledge_graph_edges(from_node_id, to_node_id, relationship);
ALTER TABLE knowledge_graph_edges ENABLE ROW LEVEL SECURITY;
```

### 6.10 `governance_score` Table (SOT-007)

```sql
CREATE TABLE IF NOT EXISTS governance_score (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  score_id        uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  score           numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  computed_at     timestamptz NOT NULL DEFAULT now(),
  window_start    timestamptz NOT NULL,
  window_end      timestamptz NOT NULL,
  base_score      numeric(5,2) NOT NULL,
  delta_sum       numeric(7,2) NOT NULL,
  contributing_records_count integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: append-only; each computation creates a new record
);

CREATE INDEX IF NOT EXISTS idx_governance_score_computed_at ON governance_score(computed_at DESC);
ALTER TABLE governance_score ENABLE ROW LEVEL SECURITY;
```

---

## Section 7 — Required Indexes Summary

| Table | Index | Type | Columns |
|---|---|---|---|
| tasks | idx_tasks_status | BTREE | status |
| tasks | idx_tasks_status_where_active | PARTIAL BTREE | status, planned_at WHERE active |
| events | uidx_events_idempotency_key | UNIQUE BTREE | idempotency_key |
| events | idx_events_emitted_at | BTREE | emitted_at DESC |
| governance_records | idx_governance_records_chain_link | BTREE | chain_link |
| governance_records | idx_governance_records_constitutional | PARTIAL BTREE | created_at WHERE constitutional_impact |
| audit_records | idx_audit_records_chain_link | BTREE | chain_link |
| episodic_memory | idx_episodic_memory_embedding | IVFFlat | content_embedding |
| semantic_memory | idx_semantic_memory_embedding | IVFFlat | content_embedding |
| reflexion_records | idx_reflexion_records_embedding | IVFFlat | content_embedding |
| knowledge_graph_edges | uidx_knowledge_graph_edges_pair | UNIQUE BTREE | (from, to, relationship) |

All IVFFlat indexes require `pgvector` extension: `CREATE EXTENSION IF NOT EXISTS vector;`

---

## Section 8 — Forbidden Schema Patterns

The following patterns are prohibited in the APEX Civilisation Supabase schema:

| Pattern | Reason |
|---|---|
| Table without RLS enabled | Trust boundary violation (ARCH-06 TB-001) |
| `FOR ALL USING (true)` RLS policy | Nullifies row isolation |
| Columns storing secrets, API keys, or tokens in plaintext | Security violation; use Supabase Vault or environment variables |
| `SERIAL` or `BIGSERIAL` primary keys | All PKs must be UUID v4; integer PKs are not compatible with the ARCH-04 identity model |
| Nullable `created_at` | All governed records must have a non-null creation timestamp |
| Foreign key without a named constraint | All FKs must be named per the convention in Section 2.4 |
| Table without `id` column | Mandatory column (Section 3) |
| Soft delete patterns (`deleted_at`, `is_deleted`) without audit record | Soft deletes on governed tables must produce an audit record; bare soft delete columns without the audit obligation are forbidden |
| `content_embedding vector(N)` where N ≠ 1536 | Embedding dimension must match the configured embedding model (CAP-MODEL-004, ARCH-09); mixing dimensions breaks cosine similarity |

---

## Section 9 — Schema Migration Execution Order

The Phase 3 tables must be created in the following order to satisfy foreign key dependencies:

1. `schema_migrations` (no dependencies)
2. `sessions` (no dependencies beyond auth.users)
3. `tasks` (no FK dependencies in the CREATE; `lesson_id` is not enforced as FK)
4. `events` (no table FK dependencies)
5. `governance_records` (no table FK dependencies)
6. `audit_records` (no table FK dependencies)
7. `resource_consumption` (depends on `tasks`, `sessions`)
8. `reflexion_records` (depends on `tasks`)
9. `strategic_memory` (self-referential FK; create table first, constraint is deferred)
10. `episodic_memory` (depends on `sessions`, `tasks`)
11. `semantic_memory` (self-referential FK)
12. `procedural_memory` (no table FK dependencies)
13. `skill_metrics` (no table FK dependencies)
14. `knowledge_graph_nodes` (no table FK dependencies)
15. `knowledge_graph_edges` (depends on `knowledge_graph_nodes`)
16. `governance_score` (no table FK dependencies)

---

## Section 10 — Database Schema Invariants

**INV-DB1 — RLS on All Governed Tables.** Every table in the `public` schema that holds governed entity records must have RLS enabled. A migration that creates a governed table without `ENABLE ROW LEVEL SECURITY` is non-compliant.

**INV-DB2 — UUID v4 Primary Keys.** All governed tables use UUID v4 primary keys. Integer primary keys are prohibited for governed entity tables.

**INV-DB3 — Append-Only for Audit and Event Tables.** The `events`, `audit_records`, `governance_records`, and `resource_consumption` tables are append-only. UPDATE and DELETE operations on these tables are prohibited. A migration that adds an UPDATE policy on these tables is non-compliant.

**INV-DB4 — IVFFlat Indexes on Embedding Columns.** Every `content_embedding vector(1536)` column must have an IVFFlat index. An embedding column without an IVFFlat index will produce full-table-scan similarity queries that exceed acceptable latency bounds.

**INV-DB5 — Unique Index on idempotency_key.** The `events` table must have a unique index on `idempotency_key`. Without this index, duplicate event records are possible and idempotency guarantees (ARCH-11) are voided.

**INV-DB6 — Migration Files Are Authoritative.** The physical schema in the database must match the migration files. Direct console edits to the Supabase schema that are not reflected in a migration file create an undocumented schema state and are prohibited.

---

## Section 11 — Known Implementation State

| Gap | Description | Resolution |
|---|---|---|
| Most Phase 3 tables do not yet exist | The tables defined in Section 6 have not been created in the production Supabase instance | Phase 3 implementation obligation: execute migrations in Section 9 order |
| pgvector extension not confirmed | IVFFlat indexes require pgvector; may not be enabled in the Supabase project | `CREATE EXTENSION IF NOT EXISTS vector;` must be the first migration |
| RLS policies on existing tables not audited | Tables created in Phase 1/2 may lack RLS or use permissive policies | Audit of existing tables required; remediation migrations for each non-compliant table |
| `goal-tracker.js` not demoted | goal-tracker.js currently writes to its own state without going through strategic_memory | strategic_memory table creation + read-only wrapper around goal-tracker.js; ARCH-10 C13 resolution |
| `write-with-outbox.js` not wired | The transactional outbox exists but has no consumers | Wire to all GOVERNED event emission points (ARCH-11 GAP-EVT) |

---

## Section 12 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification — terminal document in Phase 3 series | SOVEREIGN |

---

*End of ARCH-15 — Database Schema Standard*

---

## APEX Civilisation Phase 3 Architecture Series — Complete

| Document | Title | Status |
|---|---|---|
| ARCH-00 | Constitutional Foundation | RATIFIED |
| ARCH-01 | Entity Model | RATIFIED |
| ARCH-02 | Service Topology | RATIFIED |
| ARCH-03 | Registry Architecture | RATIFIED |
| ARCH-04 | Identity and Authority Specification | RATIFIED |
| ARCH-05 | Source-of-Truth Registry | RATIFIED |
| ARCH-06 | Trust Boundary Specification | RATIFIED |
| ARCH-07 | Failure Mode Policy | RATIFIED |
| ARCH-08 | Auditability Specification | RATIFIED |
| ARCH-09 | Capability Registry | RATIFIED |
| ARCH-10 | Memory Architecture | RATIFIED |
| ARCH-11 | Event Architecture | RATIFIED |
| ARCH-12 | Agent Lifecycle Model | RATIFIED |
| ARCH-13 | Knowledge Architecture | RATIFIED |
| ARCH-14 | Runtime Execution Model | RATIFIED |
| ARCH-15 | Database Schema Standard | RATIFIED |
