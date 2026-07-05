# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 00 · Registry Index

**Registry Version:** 1.0.0
**Registry Date:** 2026-07-05
**Registry Authority:** Chief Cartographer
**Operating Mode:** STRICT READ ONLY — Identity Only
**Source of Truth:** This Registry

---

## What This Registry Is

This is the first Canonical Entity Registry of the APEX Civilisation.

Every meaningful object discovered within the civilisation has been assigned a permanent identity.

Nothing has been modified. Nothing has been reorganised. Nothing has been invented.

Evidence precedes every entry. Where evidence was absent, the value is recorded as UNKNOWN.

---

## Registry Files

| File | Title | Purpose |
|---|---|---|
| `00-Registry-Index.md` | Registry Index | This file. Navigation and meta-information. |
| `01-Entity-Catalogue-Part1.md` | Entity Catalogue — Part 1 | Blocks 01–05 (ENT-000001 → ENT-000124). Block 01 uses full 29-attribute records; Blocks 02–05 compact. |
| `01-Entity-Catalogue-Part2a.md` | Entity Catalogue — Part 2a | Blocks 06–12 (ENT-000150 → ENT-000903). Agent-system, lib, routes, migrations, DB tables, env vars, docs. |
| `01-Entity-Catalogue-Part2b.md` | Entity Catalogue — Part 2b | Blocks 13–23 (ENT-000920 → ENT-001199). Scripts, config, data, public, dev-tools, agents, crons, TTS, overflow. |
| `02-Entity-Families.md` | Entity Families | Definitions of all entity family classifications used in this registry. |
| `03-Canonical-Identifiers.md` | Canonical Identifiers | Ordered list of all permanent IDs with name and path. Quick lookup surface. |
| `04-Entity-Attributes.md` | Entity Attributes | Definitions and permitted values for every attribute field used in entity records. |
| `05-Registry-Statistics.md` | Registry Statistics | Counts, distributions, coverage analysis, and quality summary. |
| `06-Unknown-Entities.md` | Unknown Entities | Entities where one or more attributes could not be determined from evidence. |
| `07-Evidence-Appendix.md` | Evidence Appendix | Source evidence files and commands used during registry construction. |
| `08-Expanded-Records-Index.md` | Part 2 Index | Index of all Part 2 expanded entity records. Contains 5 critical findings from file reads. |
| `08a-Expanded-External-Services.md` | Expanded: Block 02 | Full 29-attribute records for all 19 external services and AI models. |
| `08b-Expanded-Infrastructure.md` | Expanded: Block 03 + 22 | Full 29-attribute records for server.js, instrument.js, cron.js, piper server, task-router, middleware. |
| `08c-Expanded-Core-Lib.md` | Expanded: Core Lib | Full 29-attribute records for governance, kernel, pg_database, pg_helpers, event-bus, constitutional-gate, memory/gateway, and 3 others. |
| `08d-Expanded-Agent-System.md` | Expanded: Block 06 | Full 29-attribute records for master-orchestrator, orchestrator, finance_agent, email_agent, domain-agents, agent-registry. |
| `09-Part3-Index.md` | Part 3 Index | Dependency graph index, remediation log, complete file manifest, final statistics. |
| `09a-Expanded-Routes.md` | Expanded: Block 08 | Full 29-attribute records for all 42 HTTP route files. |
| `09b-Dependency-Graph.md` | Dependency Graph | Consumer/dependency edges, critical path, pipeline chains for all 51 attributed entities. |

---

## Identifier Format

All permanent identifiers follow this format:

```
ENT-NNNNNN
```

Where NNNNNN is a zero-padded six-digit integer, beginning at ENT-000001.

IDs are permanent. They are never changed. They are never reused.

---

## Entity ID Blocks

| Block | Range | Family |
|---|---|---|
| Block 01 | ENT-000001 → ENT-000009 | Civilisation |
| Block 02 | ENT-000010 → ENT-000039 | External Services & AI Models |
| Block 03 | ENT-000040 → ENT-000079 | Infrastructure & Runtime |
| Block 04 | ENT-000080 → ENT-000099 | Folders |
| Block 05 | ENT-000100 → ENT-000149 | Root Files |
| Block 06 | ENT-000150 → ENT-000219 | Agent-System Files |
| Block 07 | ENT-000220 → ENT-000449 | Library Files |
| Block 08 | ENT-000450 → ENT-000499 | Route Files |
| Block 09 | ENT-000500 → ENT-000559 | Migration Files |
| Block 10 | ENT-000560 → ENT-000759 | Database Tables |
| Block 11 | ENT-000760 → ENT-000809 | Environment Variables |
| Block 12 | ENT-000810 → ENT-000919 | Documentation Files |
| Block 13 | ENT-000920 → ENT-000974 | Script Files |
| Block 14 | ENT-000975 → ENT-000999 | Configuration Files |
| Block 15 | ENT-001000 → ENT-001019 | Data Files |
| Block 16 | ENT-001020 → ENT-001029 | Public Files |
| Block 17 | ENT-001030 → ENT-001059 | Dev-Tools Files |
| Block 18 | ENT-001060 → ENT-001089 | Agent Definitions (.claude) |
| Block 19 | ENT-001090 → ENT-001099 | Cron Jobs |
| Block 20 | ENT-001100 → ENT-001109 | Constitutional Rules |
| Block 21 | ENT-001110 → ENT-001129 | Piper TTS Assets |
| Block 22 | ENT-001130 → ENT-001139 | Middleware Files |
| Block 23 | ENT-001140 → ENT-001199 | Unknown / Unclassified |

---

## Registry Construction Date

2026-07-03 through 2026-07-05. Evidence gathered by direct filesystem inspection of `C:/Users/arwwo/Desktop/APEX/Scripts`. Total entities catalogued: 1,019. Registry declared v1.0.0 stable: 2026-07-05.

---

*End of 00 — Registry Index*
