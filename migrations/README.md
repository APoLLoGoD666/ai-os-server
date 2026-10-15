# Migrations

Run in strict numeric order. Each migration is idempotent unless noted otherwise.

## Order and Dependencies

| # | File | Depends on |
|---|------|-----------|
| 001 | missing_tables.sql | — (creates vector extension) |
| 002 | all_missing_tables.sql | 001 |
| 003–008 | various | 001, 002 |
| 009 | memory_architecture.sql | 001 (vector), 005 (agent_decisions table) |
| 010–022 | various | 009 |
| 023 | episodic_analytics_fix.sql | 009 (episodic_memory table) |
| 024–027 | various | prior |
| 028 | policy_schema_fix.sql | 012 (cognitive_policy_settings) |
| 029–031 | various | prior |
| 032 | intentional_gap.sql | duplicate of 028 — no-op |
| 033 | missing_core_tables.sql | prior |
| 034 | behavioral_expiry.sql | 011 (behavioral_modifications) |
| 035 | fk_constraints.sql | 005, 009, 011 |
| 036 | composite_indexes.sql | 005 (agent_decisions) |

## Notes

- **002:15** — `DROP TABLE IF EXISTS vault_embeddings` is destructive. Applied once 2026-06-13. Do not re-run on a populated database.
- **025** — Retroactive UNIQUE constraint applied directly to the live database. The file is documentary; do not re-run if rows exist.
- **032** — Intentional gap. Duplicate of 028.
- All migrations use `IF NOT EXISTS` / `IF EXISTS` unless explicitly noted.
