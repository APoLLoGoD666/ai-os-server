# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 06 · Unknown Entities

**Registry Version:** 1.0.0
**Date:** 2026-07-03

---

This file catalogues entities where one or more attributes could not be determined from available evidence at the time of registry construction. Evidence was gathered by direct filesystem inspection on 2026-07-03.

---

## Entities with Significant Unknown Attributes

### Block 01 — Civilisation Entities

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000002 | The Founder | Physical identity, exact preferences, full goal set | Human principal — not machine-readable |
| ENT-000007 | Civilisation Cycle | Exact cron schedule, trigger conditions | Requires runtime inspection of cron.js |
| ENT-000008 | Founder OS | Exact feature boundary, owned subsystem list | Distributed across many files; no single manifest |

---

### Block 02 — External Services

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000027 | Firecrawl | Exact version, endpoint URL, auth mechanism | Bridge file exists but not inspected |
| ENT-000028 | Markitdown | Exact version, endpoint URL, auth mechanism | Bridge file exists but not inspected |

---

### Block 03 — Infrastructure

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000045 | Node.js Runtime | Exact version | package.json not read during construction |
| ENT-000046 | Express.js Framework | Exact version | package.json not read during construction |
| ENT-000053 | Render Web Service | Service ID URL, exact region, instance type | Render dashboard not inspected |
| ENT-000054 | Supabase Postgres | Schema version, exact table count, region | Supabase dashboard not inspected |

---

### Block 06 — Agent-System Files

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000150 through ENT-000195 (all) | All agent-system/ files | Purpose, interfaces, dependencies, consumers | Files not individually read; compact format only |

---

### Block 07 — Library Files

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000220 through ENT-000449 (all) | All lib/ files | Purpose, interfaces, dependencies, consumers, entry/exit points | Files not individually read; compact format only |

---

### Block 08 — Route Files

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000450 through ENT-000491 (all) | All routes/ files | HTTP methods, exact endpoints, middleware chain | Files not individually read; compact format only |

---

### Block 09 — Migration Files

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000500 through ENT-000554 (all) | All migration files | Tables created, SQL operations, dependencies | Files not individually read |

---

### Block 10 — Database Tables

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000560 through ENT-000759 (all) | All Supabase tables | Column schemas, RLS rules, row counts, indexes | Supabase schema not inspected during construction |

---

### Block 11 — Environment Variables

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000760 through ENT-000803 (all) | All env vars | Current values, rotation dates, expiry | Values are secrets — not inspected |

---

### Block 12 — Documentation Files

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-000810 through ENT-000903 (all) | All docs files | Content summary, last updated date, author | Files not individually read during construction |

---

### Block 18 — Agent Definitions

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-001060 through ENT-001089 (all) | .claude agent definitions | Agent capabilities, tools used, trigger conditions | Agent files not individually read |

---

### Block 19 — Cron Jobs

| ID | Name | Unknown Attributes | Reason |
|---|---|---|---|
| ENT-001090 through ENT-001096 (all) | All cron jobs | Exact cron expression, last run time, success rate | Requires runtime inspection |

---

## Summary of Unknown Attribute Classes

| Attribute Class | Scope of Unknown |
|---|---|
| File content / purpose | All compact-format entities (Blocks 02–23) |
| Runtime behaviour | All cron jobs, pipelines, orchestrators |
| Secret values | All environment variables (by design — never inspected) |
| External service configuration | All external services (Render, Supabase, etc.) |
| Human identity attributes | ENT-000002 (The Founder) |
| Schema details | All database tables |

---

## Resolution Path

These unknowns can be resolved in registry v2 by:
1. Reading each file individually and completing the 29-attribute record
2. Querying Supabase schema via `information_schema.columns`
3. Inspecting Render dashboard for service configuration
4. Running `src/workers/cron.js` with verbose logging to capture cron expressions

---

*End of 06 — Unknown Entities*
