# APEX AI OS — Knowledge Graph Opportunities

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 8

---

## Overview

APEX already has a rich implicit knowledge graph. It exists across two layers: structured relational data in Supabase, and a dense hyperlinked note graph in the Obsidian vault. No external graph database (Neo4j, ArangoDB, etc.) is needed or justified.

---

## Supabase Implicit Graph

The following tables form a traversable relationship graph via foreign keys and name references:

```
clients
  └─► deals          (client_id FK)
        └─► projects  (deal_id FK)
              └─► tasks                (project_id FK)
                    └─► apex_agent_runs (task_id FK)
                          └─► apex_agent_stages (task_id FK)

apex_contacts
  └─► meetings       (contact_id FK or name match)
        └─► decisions (meeting_id FK or meeting_date match)

documents
  └─► vault_embeddings (source path → vault file)
```

**Traversal example:** Given a client name, you can walk: client → deals → projects → tasks → agent runs → stage failures. This is a full causal chain from business relationship to implementation detail.

| Relationship | Type | Join Condition |
|-------------|------|---------------|
| client → deal | 1:many | `deals.client_id = clients.id` |
| deal → project | 1:many | `projects.deal_id = deals.id` |
| project → task | 1:many | `tasks.project_id = projects.id` |
| task → agent run | 1:1 | `apex_agent_runs.task_id = tasks.id` |
| agent run → stage | 1:7 | `apex_agent_stages.task_id = apex_agent_runs.task_id` |
| contact → meeting | 1:many | `meetings.contact_id = contacts.id` |
| meeting → decision | 1:many | `decisions.meeting_id = meetings.id` |
| vault file → embedding | 1:many | `vault_embeddings.source = relative_path` |

---

## Obsidian Vault Graph

From v6 verification: **7,130 wikilinks** across vault notes, **22.1 average links per note**. This is already a dense knowledge graph navigable by the RAG agent.

Key hub notes (high link count) identified in v6:
- Project notes (linked from tasks, decisions, meetings)
- Person/contact notes (linked from meetings, decisions, commitments)
- Technology notes (linked from architecture decisions, project notes)

The hybrid pgvector implementation (Phase 3) adds a **semantic layer** on top of this link graph — meaning queries that don't match exact wikilink paths can still surface relevant content via embedding similarity.

---

## What Is Missing

**Cross-system links** — a Supabase `projects` row for "APEX AI OS" is not linked to the Obsidian note `Projects/APEX AI OS.md`. They share a name but have no formal join. This means:

- The RAG agent cannot navigate from a Supabase project record to its vault notes
- Decisions stored in Supabase `decisions` table are not linked to the `Decisions/` vault folder
- Agent runs have no pointer to the vault memory files they produced

---

## Lightweight Graph Layer: SQL Views

Three SQL views would expose the graph structure without any code changes. These are read-only and additive.

### v_project_graph
```sql
CREATE VIEW v_project_graph AS
SELECT
  c.name            AS client,
  d.name            AS deal,
  p.name            AS project,
  p.status          AS project_status,
  COUNT(t.id)       AS task_count,
  COUNT(ar.task_id) AS run_count
FROM clients c
JOIN deals d     ON d.client_id = c.id
JOIN projects p  ON p.deal_id = d.id
LEFT JOIN tasks t          ON t.project_id = p.id
LEFT JOIN apex_agent_runs ar ON ar.task_id = t.id
GROUP BY c.name, d.name, p.name, p.status;
```

### v_agent_run_graph
```sql
CREATE VIEW v_agent_run_graph AS
SELECT
  ar.task_id,
  ar.success        AS run_success,
  ar.cost_usd,
  ar.duration_ms,
  s.stage,
  s.success         AS stage_success,
  s.error,
  s.duration_ms     AS stage_duration_ms
FROM apex_agent_runs ar
JOIN apex_agent_stages s ON s.task_id = ar.task_id;
```

### v_knowledge_links
```sql
CREATE VIEW v_knowledge_links AS
SELECT
  ve.source         AS vault_file,
  ve.chunk_text,
  ve.mtime,
  d.title           AS supabase_doc_title
FROM vault_embeddings ve
LEFT JOIN documents d ON d.content ILIKE '%' || split_part(ve.source, '/', -1) || '%';
```

---

## Recommendation

**Add the 3 SQL views in Supabase.** No application code changes required. They are immediately queryable from the intelligence endpoints and from direct Supabase queries.

This provides graph traversal capability without introducing a graph database, and it is compatible with the existing Supabase client used throughout the application.

---

## Not Implemented This Session

The SQL views require schema validation (column names, FK constraints) against the live Supabase instance. The exact column names across all tables were not fully verified this session. The views are documented here for implementation in the next session with direct schema access.

**Next session action:** Run `SELECT column_name FROM information_schema.columns WHERE table_name IN ('projects','tasks','deals','clients','apex_agent_runs','apex_agent_stages')` and validate view definitions before creating them.
