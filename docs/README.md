# docs/

Reference documentation for the APEX AI OS codebase.

These files are read by humans, not by code at runtime.
Moving or renaming files here will not break the server.

---

## What's here

### Architecture Atlases (`*-ATLAS.md`)
Detailed maps of each subsystem — how it works, what it connects to, what it owns.
One Atlas per domain: API, Agents, Authentication, Database, Deployment, Governance,
Memory, Observability, Production, Visual Architecture.

### Planning and Strategy (`APEX-*.md`)
Historical planning documents, roadmaps, reality models, and executive assessments.
These capture decisions made and assumptions tested during development.

### Governance and Constitution
- `CONSTITUTION_EXECUTION_PATH.md` — how the constitution is enforced at runtime
- `EXECUTIVE_CONSTITUTION.md` — executive-level governance rules
- `EXECUTIVE-ARCHITECTURE-CERTIFICATION.md` — architecture sign-off document
- `FINAL-ARCHITECTURE-AUTHORIZATION.md` — final authorization record
- `GOVERNANCE_SPEC_V1.md` — governance specification version 1
- `TRUST_MODEL.md` — trust hierarchy and permission model

### Status and Audits
- `LEARNING_LOOP_STATUS.md` — current state of the learning loop
- `STABILISATION_REPORT.md` — stabilisation phase findings
- `DEAD_TISSUE_REPORT.md` — dead/unused code audit
- `DEAD-CODE-ATLAS.md` — detailed dead code map
- `DIRECTORY-CENSUS.md` — file system census
- `REPORTS.md` — index of all reports
- `PHASE0-OPEN.md` — Phase 0 open items

### Agent and System Specs
- `AGENTS.md` — agent role definitions and responsibilities
- `SUBSYSTEM-CATALOG.md` — full catalog of all subsystems
- `apex-self-knowledge.md` — system self-description

### Setup
- `SETUP.md` — how to set up the project locally
