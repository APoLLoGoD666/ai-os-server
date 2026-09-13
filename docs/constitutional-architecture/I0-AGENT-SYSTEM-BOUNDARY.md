# I0-AGENT-SYSTEM-BOUNDARY
## Agent-System / Lib Boundary Declaration

---

## Document Identification

| Field | Value |
|-------|-------|
| Document ID | I0-AGENT-SYSTEM-BOUNDARY |
| Date | 2026-07-25 |
| Author | Implementation Governance Agent |
| Change Class | Class A (Constitutional Clarification) |
| Constitutional Basis | A0-v1.1.1 §3.2; C0-IMPLEMENTATION-BASELINE-MANIFEST.md §5.2 |
| Wave | Wave 0 — Preparation (PWA-01) |
| Status | ACTIVE |
| Supersedes | None (new declaration) |

---

## Part 1 — Purpose

This document declares the constitutional boundary between two co-existing execution environments within the APEX repository:

- **`agent-system/`** — pre-constitutional agent execution environment. Present before the constitutional framework was established. Contains orchestration, agent definitions, and execution infrastructure accumulated during the pre-constitutional phase.

- **`lib/`** — constitutional runtime implementation layer. The target destination for all behavior governed by the certified RT-01 through RT-16 runtime specifications.

The boundary declared here governs how these two environments may interact during and after the constitutional implementation period. It resolves structural ambiguity about ownership, import direction, and migration obligations.

This document does not modify any application code. It creates a durable reference that implementation engineers can consult when making decisions about file placement, import relationships, and migration sequencing.

---

## Part 2 — Constitutional Authority

The authority for this boundary declaration derives from the following sources:

| Source | Provision | Application |
|--------|-----------|------------|
| A0-v1.1.1 §3.2 | Constitutional supremacy: all runtime implementations must conform to certified specifications | `lib/` implementations are governed by RT-01 through RT-16; `agent-system/` files are not |
| C0-IMPLEMENTATION-BASELINE-MANIFEST.md §5.2 | Implementation constraints: identified risks including conflation of distinct constitutional systems | Item 6: "agent-system is pre-constitutional — do not let it govern constitutional behavior" |
| I0-IMPLEMENTATION-BASELINE-AUDIT.md | Pre-constitutional audit findings | `agent-system/` identified as legacy execution environment requiring explicit classification |
| I0-LEGACY-AND-OVERLAP-REGISTER.md | OVL-004 | `agent-system/episodic-memory.js` overlaps with `lib/memory/`; boundary ambiguity flagged |
| I1-REPOSITORY-MIGRATION-PLAN.md | Migration dispositions | Several `agent-system/` files listed with RETAIN/MIGRATE classification pending |
| I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md | PWA-01 task specification | This document is the required output of PWA-01 |

---

## Part 3 — Definitions

**Pre-constitutional layer:** Code that exists in the repository and performs useful work, but whose design was not governed by the APEX constitutional framework (A0, D-series, R-series). The `agent-system/` directory is the pre-constitutional layer.

**Constitutional layer:** Code whose design is governed by and traceable to certified RT-01 through RT-16 runtime specifications. The `lib/` directory is the intended constitutional layer. Note: at the start of Wave 0, `lib/` contains both constitutional implementations (e.g., `lib/governance.js`, `lib/runtime/`) and pre-constitutional utilities (e.g., `lib/clients.js`, `lib/pg_helpers.js`) — only files governed by a certified runtime specification are "constitutional" within `lib/`.

**Constitutional runtime:** Any of RT-01 through RT-16, as specified in their canonical documents and certified in C0-IMPLEMENTATION-BASELINE-MANIFEST.md.

**Execution layer:** Components responsible for dispatching, routing, and running agent tasks. `orchestrator.js`, `master-orchestrator.js`, and related files in `agent-system/` are execution-layer components.

**Consumer:** A component that imports and uses another component's exports. A consumer depends on its dependency; the dependency does not depend on the consumer.

**Import direction:** The direction of `require()` calls. `A → B` means A imports B; A is a consumer of B.

---

## Part 4 — Ownership Boundary Rules

### Rule OB-1: agent-system is a consumer of lib, not a peer

`agent-system/` components are consumers of `lib/` components. The execution environment calls into the constitutional layer to access capabilities (memory, cognition, governance). This relationship is explicitly asymmetric.

### Rule OB-2: lib must not import from agent-system

No file in `lib/` may contain a `require()` call referencing a path within `agent-system/`. Constitutional runtime implementations must be self-contained within `lib/`. Allowing `lib/` to depend on `agent-system/` would make constitutional behavior contingent on pre-constitutional code — a violation of A0-v1.1.1 §3.2.

**Current status:** SATISFIED. Inspection at Wave 0 baseline confirms zero `lib/` → `agent-system/` imports.

### Rule OB-3: agent-system may not implement constitutional primitives

Files in `agent-system/` must not contain implementations of constitutional object types (as defined in RT-01 through RT-16). If an `agent-system/` file contains logic that belongs to a certified runtime specification, that logic is a migration candidate, not a permanent resident.

### Rule OB-4: Constitutional runtimes must not be governed by agent-system

Execution flow within constitutional runtimes (lib/runtime/) must not pass control to `agent-system/` orchestrators as a governance step. Orchestrators may call runtimes; runtimes must not delegate authority to orchestrators.

### Rule OB-5: agent-system is not extended for constitutional purposes

New constitutional behavior (behavior required by a certified runtime specification) must be implemented in `lib/`, not in `agent-system/`. `agent-system/` may be extended for execution-layer purposes only.

---

## Part 5 — Import Dependency Rules

### Observed Dependency Graph (Wave 0 Baseline)

**Direction:** `agent-system/` → `lib/` (one-way; constitutional correct direction)

| `agent-system/` file | `lib/` modules imported |
|---------------------|------------------------|
| adaptation-engine.js | `lib/clients`, `lib/memory/episodic-memory-pg` |
| agent-library.js | `lib/models/runtime` |
| agent-pipeline-hooks.js | `lib/governance`, `lib/write-with-outbox` |
| autonomy-metrics.js | `lib/memory/episodic-memory-pg` |
| browser-agent.js | `lib/models/runtime` |
| capture-classifier.js | `lib/models/runtime`, `lib/clients` |
| cloud_autopilot.js | `lib/models/runtime`, `lib/clients` |
| domain-agents.js | `lib/models/runtime` |
| email_agent.js | `lib/pg_helpers`, `lib/models/runtime`, `lib/write-with-outbox`, `lib/event-bus` |
| finance_agent.js | `lib/pg_helpers`, `lib/models/runtime` |
| improvement-executor.js | `lib/memory/episodic-memory-pg`, `lib/clients` |
| langchain-rag.js | `lib/embed` |
| master-orchestrator.js | `lib/runtime/constitutional-gate`, `lib/clients`, `lib/models/runtime` |
| memory-indexer.js | `lib/embed` |
| memory-retriever.js | `lib/embed` |
| obsidian-memory.js | `lib/memory/gateway` |
| orchestrator.js | `lib/governance`, `lib/models/runtime`, `lib/memory/gateway`, `lib/memory/reflexion-tracker`, `lib/memory/skill-memory`, `lib/memory/consolidation-engine`, `lib/memory/working-memory`, `lib/intelligence/context-composer`, `lib/intelligence/knowledge-validator`, `lib/intelligence/decision-intelligence`, `lib/intelligence/planning-influence-engine`, `lib/intelligence/graph-reasoning-engine`, `lib/cognitive/meta-reasoning-engine`, `lib/cognitive/retrieval-evaluation-engine`, `lib/cognitive/retrieval-policy-engine`, `lib/cognitive/runtime`, `lib/cognitive`, `lib/cognitive/effectiveness/outcome-attribution-engine`, `lib/cognitive/effectiveness/digital-twin-accuracy-engine`, `lib/runtime/assembler`, `lib/executive/trigger-evaluator`, `lib/founder`, `lib/intent`, `lib/consumption-log`, `lib/write-with-outbox`, `lib/clients` |
| prompt-expander.js | `lib/models/runtime` |
| reflection-engine.js | `lib/models/runtime`, `lib/clients` |
| reflection_agent.js | `lib/pg_helpers`, `lib/models/runtime` |
| routine_agent.js | `lib/pg_helpers`, `lib/clients`, `lib/models/runtime` |
| self-evaluator.js | `lib/memory/episodic-memory-pg` |

**Direction:** `lib/` → `agent-system/` — **NONE** (correct; zero violations at baseline)

### Dependency Rule Summary

| Rule | Direction | Status |
|------|-----------|--------|
| `agent-system/` → `lib/`: PERMITTED | 25 files import from lib/ | PERMITTED — consistent with consumer role |
| `lib/` → `agent-system/`: FORBIDDEN | 0 files import from agent-system/ | SATISFIED at baseline |

---

## Part 6 — Allowed Patterns

The following import and architectural patterns are explicitly permitted:

| Pattern | Example | Rationale |
|---------|---------|-----------|
| `agent-system/` imports `lib/` utility modules | `require('../lib/clients')` | Execution environment legitimately uses shared infrastructure |
| `agent-system/` imports `lib/` constitutional modules | `require('../lib/governance')` | Orchestrators checking constitutional compliance is expected behavior |
| `agent-system/` imports `lib/memory/*` | `require('../lib/memory/episodic-memory-pg')` | Memory access is a legitimate execution-layer need |
| `agent-system/` imports `lib/intelligence/*` | `require('../lib/intelligence/decision-intelligence')` | Intelligence consultation from execution layer is permitted |
| `agent-system/` imports `lib/cognitive/*` | `require('../lib/cognitive/runtime')` | Cognitive layer access from execution layer is permitted |
| `agent-system/` imports `lib/runtime/*` for gate checks | `require('../lib/runtime/constitutional-gate')` | Constitutional gate enforcement at execution boundary is correct behavior |
| New `agent-system/` files importing `lib/` | Any future agent file requiring lib modules | Remains permitted as long as it is downward (execution → constitutional) |

---

## Part 7 — Forbidden Patterns

The following patterns are explicitly forbidden and constitute constitutional violations if introduced:

| Pattern | Example | Reason |
|---------|---------|--------|
| `lib/` imports any `agent-system/` file | `require('../agent-system/orchestrator')` | Constitutional runtimes must not depend on pre-constitutional execution layer |
| `lib/runtime/*` delegates to `agent-system/` orchestrators | `orchestrator.run(task)` from within a runtime | Inverts the authority relationship; execution calls runtimes, not vice versa |
| New constitutional type definitions in `agent-system/` | Defining `AgentIdentity` struct in `agent-system/agents.js` | Constitutional primitives belong in `lib/constitutional-types/` |
| New RT-0x behavior implemented in `agent-system/` | Implementing RT-07 memory consolidation in `agent-system/orchestrator.js` | Constitutional runtime behavior belongs in `lib/` |
| `agent-system/` file acting as the authoritative store for constitutional state | `agent-system/episodic-memory.js` as the sole episodic memory implementation | OVL-004: constitutional memory must be in `lib/memory/`; agent-system file is migration candidate |
| Bidirectional imports between the layers | `lib/X` imports `agent-system/Y`; `agent-system/Y` imports `lib/X` | Creates circular constitutional dependency; violates OB-2 |

---

## Part 8 — Classification of Current `agent-system/` Contents

### Classification Criteria

- **RETAIN**: File contains execution-layer logic that does not overlap with any certified runtime specification. Remains in `agent-system/` indefinitely. Constitutional runtimes do not replace it.
- **MIGRATE**: File contains logic that belongs to a certified RT-0x runtime specification. Must be moved to `lib/` during the relevant wave. Its current location in `agent-system/` is temporary.
- **ISOLATE**: File has mixed concerns — partially execution-layer (RETAIN) and partially constitutional (MIGRATE). Must be analyzed before the relevant wave to determine which portions migrate and which are left or refactored.
- **ARCHIVE**: File is demonstrably unused or superseded. Not referenced by any active caller. Candidate for removal after audit confirmation.

### Classification Table

| File | Classification | Basis |
|------|--------------|-------|
| orchestrator.js | RETAIN | Core execution pipeline; no certified RT-0x specification replaces the orchestration role |
| master-orchestrator.js | RETAIN | Multi-agent execution governance; not a constitutional runtime |
| improvement-executor.js | RETAIN | Task execution improvement loop; execution-layer concern |
| browser-agent.js | RETAIN | Browser automation agent; execution-layer concern |
| agents.js | RETAIN | Agent dispatch registry; execution-layer concern |
| domain-agents.js | RETAIN | Domain-specific agent definitions with API documentation; execution-layer |
| multi-agent-coordinator.js | RETAIN | Agent coordination; execution-layer concern |
| agent-registry.js | RETAIN | Agent type registry; execution-layer concern |
| agent-library.js | RETAIN | Agent library; execution-layer concern |
| agent-pipeline-hooks.js | RETAIN | Pipeline lifecycle hooks; execution-layer |
| agent-reputation.js | RETAIN | Agent reputation tracking; execution-layer metric |
| reflection_agent.js | RETAIN | Agent-executed reflection; execution-layer |
| reflection-engine.js | RETAIN | Reflection execution; execution-layer |
| routine_agent.js | RETAIN | Scheduled routine execution; execution-layer |
| email_agent.js | RETAIN | Email execution agent; execution-layer |
| finance_agent.js | RETAIN | Finance execution agent; execution-layer |
| cloud_autopilot.js | RETAIN | Cloud automation execution; execution-layer |
| task-planner.js | RETAIN | Task planning within agent execution; execution-layer |
| dynamic-agent-selector.js | RETAIN | Runtime agent selection; execution-layer |
| planning-quality-registry.js | RETAIN | Planning quality metrics; execution-layer |
| goal-tracker.js | RETAIN | Agent goal tracking; execution-layer |
| self-evaluator.js | RETAIN | Agent self-evaluation; execution-layer |
| execution-verifier.js | RETAIN | Execution verification; execution-layer |
| confidence-estimator.js | RETAIN | Agent confidence estimation; execution-layer |
| impeccable-validator.js | RETAIN | Validation execution; execution-layer |
| autonomy-metrics.js | RETAIN | Autonomy system metrics; execution-layer |
| backup-manager.js | RETAIN | Backup execution; execution-layer utility |
| adaptation-engine.js | ISOLATE | Contains adaptation logic that may overlap with RT-14 (Reflection Runtime) |
| adaptation-registry.json | RETAIN | Static data registry; not code |
| episodic-memory.js | MIGRATE | OVL-004: overlaps with `lib/memory/` episodic memory implementation. Constitutional memory belongs in `lib/memory/`. Migration target: `lib/memory/` (already has episodic-memory-pg.js). Audit required to determine if this file adds anything not in the lib version. |
| memory-indexer.js | ISOLATE | Memory indexing logic; may overlap with RT-07 (Memory Runtime) consolidation. Requires audit before Wave 3 memory work. |
| memory-retriever.js | ISOLATE | Memory retrieval logic; may overlap with RT-07 (Memory Runtime) retrieval. Requires audit before Wave 3 memory work. |
| langchain-memory.js | RETAIN | LangChain integration adapter; not a constitutional memory implementation |
| langchain-rag.js | RETAIN | RAG execution adapter; execution-layer |
| obsidian-memory.js | RETAIN | Obsidian integration adapter; external service bridge |
| obsidian-client.js | RETAIN | Obsidian HTTP client; external service client |
| mastra_agents.js | RETAIN | Mastra framework integration; third-party execution adapter |
| rag-bridge.js | RETAIN | RAG bridge adapter; execution-layer |
| firecrawl-bridge.js | RETAIN | Firecrawl bridge adapter; external service |
| markitdown-bridge.js | RETAIN | Markitdown bridge adapter; external service |
| news-ingest.js | RETAIN | News ingestion; execution-layer data pipeline |
| cs249r-reader.js | RETAIN | Document reader; execution-layer utility |
| wiki-reader.js | RETAIN | Wiki reader; execution-layer utility |
| supabase-setup.js | RETAIN | Database setup utility; execution-layer infrastructure |
| capture-classifier.js | RETAIN | Input classification; execution-layer preprocessing |
| prompt-expander.js | RETAIN | Prompt expansion; execution-layer utility |
| ownership.yaml | RETAIN | Static metadata; not code |

### Classification Summary

| Classification | Count |
|---------------|-------|
| RETAIN | 37 |
| ISOLATE | 3 (adaptation-engine.js, memory-indexer.js, memory-retriever.js) |
| MIGRATE | 1 (episodic-memory.js) |
| ARCHIVE | 0 (no confirmed unused files at Wave 0 baseline) |

---

## Part 9 — Classification of Current `lib/` Contents

Within `lib/`, two categories of files coexist:

**Category A — Constitutional implementations:** Files whose content is governed by a certified RT-0x runtime specification. These are the primary targets of the Wave 1–3 implementation work.

**Category B — Infrastructure utilities:** Files providing shared infrastructure (database, API clients, utilities) that are not governed by a specific runtime specification. They are used by both `agent-system/` and constitutional implementations.

### lib/ Constitutional Implementations (Category A)

| Path | Constitutional Runtime | Wave |
|------|----------------------|------|
| `lib/runtime/constitutional-gate.js` | RT-03 (Kernel Runtime) | Wave 2 |
| `lib/runtime/assembler.js` | RT-03 (Kernel Runtime) | Wave 2 |
| `lib/governance.js` | RT-02 (Authority Runtime) | Wave 2 |
| `lib/constitution.js` | RT-01 (Identity Runtime) | Wave 1 |
| `lib/constitution/authority-resistance.js` | RT-02 — IDR-002: migrating to `lib/authority/` | Wave 2 |
| `lib/memory/` (directory) | RT-07 (Memory Runtime) | Wave 3 |
| `lib/intelligence/` (directory) | RT-10 (Intelligence Runtime) | Wave 3 |
| `lib/cognitive/` (directory) | RT-10 / RT-11 | Wave 3 |
| `lib/reality/` (directory) | RT-05 (Reality Fabric Runtime) | Wave 2–3 |
| `lib/registry/` (directory) | RT-03 (Kernel Runtime) | Wave 2 |
| `lib/audit/` (directory) | RT-04 (Audit Runtime) | Wave 2 |
| `lib/intent/` (directory) | RT-09 (Knowledge Runtime) | Wave 3 |
| `lib/executive/` (directory) | RT-12 (Decision Runtime) | Wave 3 |
| `lib/civilisation/` (directory) | RT-11 (Civilization Intelligence Runtime) | Wave 3 |
| `lib/runtime/` (directory) | RT-03 (Kernel Runtime) | Wave 2 |
| `lib/founder/` (directory) | RT-01 / RT-02 / RT-12 | Wave 2–3 |

### lib/ Infrastructure Utilities (Category B)

| Path | Purpose | Constitutional Status |
|------|---------|----------------------|
| `lib/clients.js` | Supabase + Anthropic client factories | Shared infrastructure — not governed by any RT |
| `lib/pg_helpers.js` | Postgres query helpers | Shared infrastructure |
| `lib/pg_database.js` | Postgres connection | Shared infrastructure |
| `lib/models/runtime.js` | AI model routing/selection | Shared infrastructure (execution-layer utility) |
| `lib/embed.js` | Text embedding | Shared infrastructure |
| `lib/logger.js` | Logging | Shared infrastructure |
| `lib/event-bus.js` | In-process event bus | Shared infrastructure |
| `lib/write-with-outbox.js` | Write + outbox relay | Shared infrastructure |
| `lib/consumption-log.js` | Token/cost tracking | Shared infrastructure |
| `lib/utils.js` | General utilities | Shared infrastructure |
| `lib/middleware.js` | Express middleware | Application infrastructure |
| `lib/error-handlers.js` | Error handling | Application infrastructure |
| `lib/storage.js` | Supabase Storage helpers | Shared infrastructure |
| `lib/governance-meta.js` | Governance metadata | May overlap with RT-02; audit at Wave 2 |
| `lib/governance-probe.js` | Governance probing | May overlap with RT-02; audit at Wave 2 |

### lib/ Mixed / Unclassified (requires Wave-specific audit)

| Path | Notes |
|------|-------|
| `lib/agent-command-handler.js` | Large file (66.1K); contains agent dispatch logic; boundary with agent-system/ unclear |
| `lib/agent-task-cycle.js` | Task cycle management; may have overlap with orchestrator.js |
| `lib/cron-scheduler.js` | Cron scheduling; execution-layer or RT-13 (Action Runtime)? |
| `lib/cognitive-orchestrator.js` | Cognitive orchestration; may overlap with agent-system/orchestrator.js |
| `lib/startup.js` | Application startup; orchestration concern |
| `lib/kernel.js` | Application kernel; may be RT-03 target |

---

## Part 10 — Runtime Ownership Implications

The following table maps `agent-system/` files that import from constitutional-layer `lib/` modules to their constitutional runtime ownership. This informs migration sequencing.

| Constitutional Concern | lib/ Module | agent-system/ Callers | Owning Runtime |
|----------------------|-------------|----------------------|---------------|
| Constitutional gate check | `lib/runtime/constitutional-gate` | master-orchestrator.js | RT-03 (Kernel) |
| Authority / governance | `lib/governance` | orchestrator.js, agent-pipeline-hooks.js | RT-02 (Authority) |
| Memory (episodic) | `lib/memory/episodic-memory-pg` | orchestrator.js, adaptation-engine.js, improvement-executor.js, autonomy-metrics.js, self-evaluator.js | RT-07 (Memory) |
| Memory (gateway) | `lib/memory/gateway` | orchestrator.js, obsidian-memory.js | RT-07 (Memory) |
| Memory (skill) | `lib/memory/skill-memory` | orchestrator.js | RT-07 (Memory) |
| Memory (consolidation) | `lib/memory/consolidation-engine` | orchestrator.js | RT-07 (Memory) |
| Memory (working) | `lib/memory/working-memory` | orchestrator.js | RT-07 (Memory) |
| Memory (reflexion) | `lib/memory/reflexion-tracker` | orchestrator.js | RT-14 (Reflection) |
| Intelligence | `lib/intelligence/*` | orchestrator.js | RT-10 (Intelligence) |
| Cognitive | `lib/cognitive/*` | orchestrator.js | RT-10 / RT-11 |
| Executive decision | `lib/executive/trigger-evaluator` | orchestrator.js | RT-12 (Decision) |
| Founder alignment | `lib/founder` | orchestrator.js | RT-01 / RT-12 |
| Intent attribution | `lib/intent` | orchestrator.js | RT-09 (Knowledge) |
| Runtime assembly | `lib/runtime/assembler` | orchestrator.js | RT-03 (Kernel) |

**Implication:** `orchestrator.js` is the deepest consumer of constitutional modules in `agent-system/`. Its constitutional integrations span RT-02, RT-03, RT-07, RT-09, RT-10, RT-11, RT-12, RT-14. As these runtimes are implemented in Waves 2–3, the integration points in `orchestrator.js` must be verified for compatibility with the new constitutional implementations. This is not a migration — orchestrator.js remains in `agent-system/` — but its import targets will evolve.

---

## Part 11 — Implementation Constraints

The following constraints apply to all Wave 1–3 implementation work derived from this boundary declaration:

| Constraint | Rule | Enforced By |
|-----------|------|------------|
| IC-1 | No new `lib/` → `agent-system/` imports may be introduced in any wave | Gate checks + code review |
| IC-2 | `agent-system/episodic-memory.js` must be audited against `lib/memory/episodic-memory-pg.js` before OVL-004 is marked resolved | Wave 3 gate criterion |
| IC-3 | Files classified ISOLATE (adaptation-engine.js, memory-indexer.js, memory-retriever.js) must be audited for constitutional overlap before the wave that implements their associated runtimes | RT-14 → audit adaptation-engine.js; RT-07 → audit memory-indexer.js, memory-retriever.js |
| IC-4 | `lib/constitutional-types/` (created in W1-01) must not be imported from `agent-system/` until the types are stable (Wave 1 complete) | Wave 1 exit criterion |
| IC-5 | `lib/authority/` (created in Wave 2 per IDR-002) is a constitutional module; `agent-system/` files may import it as a consumer, not as a contributor | IDR-002 compliance |
| IC-6 | When `lib/constitution/authority-resistance.js` is migrated to `lib/authority/authority-resistance.js` (Wave 2), update any `agent-system/` callers that reference the old path | IDR-002 migration step |
| IC-7 | `agent-system/` files classified RETAIN must not be modified as part of constitutional implementation work. If a RETAIN file needs to be updated (e.g., to call a new constitutional API), that change must be documented in the relevant wave task record | Constitutional scope discipline |

---

## Part 12 — Migration Future State

### Target State (post-Wave 3)

At full Wave 3 completion:

1. **`agent-system/`** remains the execution environment. All RETAIN files continue to reside there. The execution layer has not changed in purpose or structure; it has gained access to fully-implemented constitutional modules through the same import paths it already uses.

2. **`agent-system/episodic-memory.js`** (MIGRATE): has been audited and either: (a) confirmed as a pure duplicate of `lib/memory/episodic-memory-pg.js` and deleted, with any unique callers migrated; or (b) its unique logic has been incorporated into `lib/memory/` and the original file removed.

3. **ISOLATE files** (adaptation-engine.js, memory-indexer.js, memory-retriever.js): have been audited. Any constitutional logic extracted into `lib/`. Remaining execution-layer logic reclassified as RETAIN.

4. **`lib/`** contains complete, certified implementations of all 16 runtimes traceable to their canonical R-series specifications. No RT-0x behavior exists outside of `lib/`.

5. **`lib/constitutional-types/`** is populated with all 35+ type definitions (W1-01 through W1-16). `agent-system/` files use these types as consumers, importing them through standard `require()` paths.

6. **Import direction** remains one-way: `agent-system/` → `lib/`. No `lib/` file imports from `agent-system/`. This invariant is enforced by Gate checks.

### Migration Trigger Table

| File | Current Location | Migration Target | Trigger Wave |
|------|-----------------|------------------|-------------|
| episodic-memory.js | `agent-system/` | `lib/memory/` (or DELETED if pure duplicate) | Wave 3 — before RT-07 implementation |
| adaptation-engine.js (constitutional portion) | `agent-system/` | `lib/` (RT-14 appropriate path) | Wave 3 — before RT-14 implementation |
| memory-indexer.js (constitutional portion) | `agent-system/` | `lib/memory/` | Wave 3 — before RT-07 implementation |
| memory-retriever.js (constitutional portion) | `agent-system/` | `lib/memory/` | Wave 3 — before RT-07 implementation |
| `lib/constitution/authority-resistance.js` | `lib/constitution/` | `lib/authority/authority-resistance.js` | Wave 2 — IDR-002 (W2-03) |

---

## Validation Record

| Check | Result |
|-------|--------|
| `agent-system/` directory inventoried | PASS — 47 files classified |
| `lib/` directory inventoried | PASS — 80+ entries surveyed |
| `lib/` → `agent-system/` imports: zero | PASS — grep confirms 0 violations at baseline |
| `agent-system/` → `lib/` import map complete | PASS — 25 files mapped; all permitted |
| OVL-004 (episodic-memory.js overlap) addressed | PASS — classified MIGRATE; trigger wave identified |
| Forbidden patterns enumerated | PASS — 6 patterns defined |
| IC constraints documented | PASS — 7 constraints with enforcement mechanism |
| NC-003 path conflict resolved | PASS — document created at I2-FIRST-WAVE-PLAN.md specified path |

---

## OVL-004 Status

**OVL-004 (MEDIUM): PARTIALLY RESOLVED**

The overlap between `agent-system/episodic-memory.js` and `lib/memory/` is classified as MIGRATE and assigned to Wave 3 for audit and resolution. Full resolution requires comparison of the two implementations and determination of whether `agent-system/episodic-memory.js` contains any logic not present in `lib/memory/episodic-memory-pg.js`. OVL-004 will be marked RESOLVED when `agent-system/episodic-memory.js` is either deleted (pure duplicate) or its unique logic is incorporated into `lib/memory/` and the original removed.

---

## Wave 0 Exit Criterion Contribution

This document satisfies the PWA-01 Wave 0 task. With PWA-02 also complete, Wave 0 exit criteria are satisfied:

| Criterion | Status |
|-----------|--------|
| `routes/civilisation.js` deleted; single civilization route mount in server.js | SATISFIED (PWA-02) |
| `node --check server.js` passes | SATISFIED (PWA-02) |
| `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md` exists | SATISFIED (this document — PWA-01) |

**Wave 0 is complete. Gate 1 verification may proceed.**

---

*I0-AGENT-SYSTEM-BOUNDARY | Wave 0 — PWA-01 | Date: 2026-07-25 | Baseline: APEX-CONSTITUTION-v1.0*
*Authority: I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md §PWA-01 | Status: ACTIVE*
