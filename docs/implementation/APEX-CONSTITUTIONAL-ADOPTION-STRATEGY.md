# APEX Constitutional Adoption Strategy

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | APEX-CONSTITUTIONAL-ADOPTION-STRATEGY |
| Type | Architectural Strategy |
| Status | **ACTIVE** |
| Date | 2026-07-27 |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Constitutional Authority | A0-v1.1.1; I2-IMPLEMENTATION-GOVERNANCE-MODEL.md |
| Wave Scope | Post-Wave-1 onwards |
| Supersedes | None |
| Amended By | None |

**Purpose:** This document is the governing strategy for the progressive constitutional adoption of the pre-existing APEX runtime. It defines what constitutional adoption means, how it is measured, how it is sequenced, and what constitutes completion. Every migration decision after Wave 1 should be traceable to this document.

**Authority note:** This document is a strategic instrument. It does not create constitutional authority, amend any A-series document, modify any R-series specification, or alter the Wave 1 or Wave 2 implementation order. Its authority derives from being the recorded strategic intent of the implementation programme under the governance framework established in I2-IMPLEMENTATION-GOVERNANCE-MODEL.md.

---

## PART 1 — WHAT IS CONSTITUTIONAL ADOPTION?

### 1.1 Formal Definition

**Constitutional Adoption** is the process by which a pre-existing software subsystem is progressively brought into constitutional compliance — meaning it operates in accordance with the authority, ownership, invariant, and provenance requirements of APEX-CONSTITUTION-v1.0 — without requiring its core logic to be discarded or rewritten from scratch.

A subsystem is constitutionally adopted when it satisfies all criteria in Part 9 of this document. Until then it exists on a spectrum from *unassessed* through *partially compliant* to *certified*.

Adoption is not a single event. It is a state that is progressively approached through discrete, verifiable steps, each of which produces a measurable capability gain.

### 1.2 Adoption Differs from Rewriting

A rewrite discards the existing implementation and produces a new one from a clean slate. Adoption retains the existing implementation as the behavioural core and adds a constitutional layer around it, through it, and — where necessary — alongside it.

The APEX runtime was built before the constitutional architecture existed. It contains substantial, working, tested logic that correctly solves real problems: decision execution, memory retrieval, coherence evaluation, agent orchestration, and more. That logic has engineering value that would take significant time to recreate.

Constitutional adoption treats that logic as an asset to be governed, not an obstacle to be eliminated.

Rewriting is required only where:

1. The existing implementation actively prevents constitutional compliance and cannot be wrapped (structural incompatibility).
2. The existing implementation violates a constitutional prohibition that cannot be remedied without replacement (prohibition violation).
3. The existing implementation would require more engineering effort to adapt than to replace (inversion of value).

In all other cases, adoption — not rewriting — is the correct strategy.

### 1.3 Why Adoption Preserves Engineering Investment

The pre-existing APEX runtime represents a substantial body of implemented behaviour:

- A working 6-gate constitutional gate sequence (`lib/runtime/constitutional-gate.js`)
- A working PETL transaction state machine (`lib/runtime/execution-transaction.js`) with 6 states and 6 gates
- A working Reality Fabric (`lib/reality/fabric.js`) with a 13-stage lifecycle
- A working civilizational deliberation and consensus system (`civilisation/consensus.js`)
- A working intelligence synthesis engine (`lib/intelligence/sie.js`)
- A working memory architecture across episodic, semantic, procedural, and decision memory layers
- A working cognitive subsystem with over 15 specialised reasoning and behaviour engines
- A working domain route layer across ~42 routes covering agents, intelligence, governance, memory, domains, and more
- A working observation and health monitoring system (`lib/observer-health/`)
- A working audit trail in `lib/audit/decision_ledger.js`
- A working governance attestation system in `lib/runtime/governance-attestation.js`

Constitutional adoption wraps this investment in formal authority, provenance tracking, and constitutional object types — it does not replace it. The value created in building the runtime is preserved; the constitutional architecture adds the governance layer the runtime needs to be trusted, audited, and extended safely.

---

## PART 2 — MIGRATION PHILOSOPHY

The following principles govern every adoption decision. They are listed in descending priority. When principles conflict, the higher-priority principle governs.

### P-1: Constitutional Authority Always Overrides Implementation Convenience

If an existing implementation produces the correct behaviour but cannot be made constitutionally compliant without modification, it must be modified. The constitution is not a recommendation. Constitutionally prohibited behaviour must be eliminated regardless of the cost.

This includes: prohibited authority claims, bypassed gate sequences, suppressed provenance, forged identity, and Projection Boundary violations.

### P-2: Preserve Working Software Whenever Constitutionally Acceptable

If an existing implementation produces constitutionally acceptable behaviour, it is preserved exactly as it is. The adoption process adds a constitutional layer; it does not disturb the working core unless P-1 requires it.

This principle is the primary reason constitutional adoption exists as a strategy at all. It is not a shortcut — it is the recognition that proven behaviour under constitutional governance is more valuable than theoretically correct behaviour that has never been tested in production.

### P-3: Replace Only Where Constitutional Compliance Cannot Be Achieved Otherwise

Rewriting or replacing a subsystem is a last resort, not a first response to constitutional non-compliance. Before replacement is authorised, the following must be true:

- The non-compliance has been formally identified and documented.
- At least two wrapping or adaptation approaches have been evaluated and found insufficient.
- An IDR has been filed and approved authorising the replacement.

### P-4: Prefer Incremental Migration

A subsystem is not migrated in a single operation. It is migrated through a sequence of discrete steps, each of which leaves the system in a valid, working, deployable state. No migration step should produce an intermediate state that is less correct than the state that preceded it.

This means: wrap before replacing, add before removing, test before deploying.

### P-5: Preserve Behaviour While Improving Correctness

Adoption must not change observable system behaviour except where constitutional compliance requires it. The end user should not notice that a migration has occurred. The constitution gains governance, the runtime gains correctness, and the user retains the behaviour they depend on.

Where constitutional compliance does require a behaviour change, that change is explicitly documented as a constitutional necessity (not an incidental improvement), and the change is tested before deployment.

### P-6: Every Migration Must Produce Measurable Capability

No migration step is justified by "moving towards compliance" alone. Each step must produce at least one of the following:

- A new constitutional object type produced in live operations.
- A new constitutional gate enforced in live execution.
- A new constitutional invariant observed in live data.
- A new subsystem available for constitutional audit.
- A new provenance chain established in the data store.

If a migration step does not produce measurable capability, it should be deferred until it can be combined with a step that does.

### P-7: Every Migration Must Be Reversible

Every adoption step must have a documented rollback plan. The rollback must restore the system to its pre-migration state within a defined time bound. Irreversible migrations require senior authorization and IDR filing.

### P-8: Adoption Is Not Completion

A subsystem that passes constitutional adoption certification is not frozen. The constitution evolves (via RT-16 amendment pipeline), and adopted subsystems must evolve with it. Adoption certification states that a subsystem is constitutionally compliant as of the certification date; it does not exempt the subsystem from future compliance requirements.

---

## PART 3 — SUBSYSTEM ADOPTION LIFECYCLE

Every APEX subsystem follows the same adoption lifecycle. The lifecycle has ten stages. A subsystem may only advance to the next stage when all exit criteria for the current stage are satisfied.

### Stage 0: Inventory

**Purpose:** Record that the subsystem exists and establish its initial identity.

**Inputs:** Code in the repository; build/deploy configuration; existing documentation.

**Outputs:** Subsystem entry in the Adoption Atlas (Part 6). Name, file paths, brief description, and known dependencies recorded. No analysis performed.

**Exit criteria:** Subsystem appears in the Adoption Atlas with a unique name and primary file path(s).

**Required evidence:** Atlas entry exists.

### Stage 1: Architecture Census

**Purpose:** Understand what the subsystem currently does, how it is structured, and what its external interfaces are.

**Inputs:** Stage 0 inventory. Source code of the subsystem.

**Outputs:** Architecture Census Report. Documents: primary responsibility, public API surface (functions exported, events emitted/consumed, routes served), data stores written/read, key dependencies (upstream callers, downstream dependencies), known invariants already enforced.

**Exit criteria:** Architecture Census Report exists. Report contains: primary responsibility, public API surface, data store dependencies, constitutional runtime candidate (which RT-NN should govern this subsystem).

**Required evidence:** Architecture Census Report filed in `docs/implementation/census/`.

### Stage 2: Ownership Mapping

**Purpose:** Assign every public object, event, and interface of the subsystem to a constitutional runtime owner.

**Inputs:** Stage 1 Architecture Census Report. A-series documents (A0-v1.1.1). R-series specifications for candidate runtimes.

**Outputs:** Ownership Map. For each public interface: constitutional runtime owner, authority type, production or consumption role (D8 §4.1 classification), and channel classification (Class A / Class B).

**Exit criteria:** Every public interface has an assigned runtime owner. No interface is unowned. Conflicts between proposed owners are resolved and documented.

**Required evidence:** Ownership Map filed in `docs/implementation/ownership/`.

### Stage 3: Constitutional Comparison

**Purpose:** Compare the subsystem's current behaviour against its assigned runtime specification.

**Inputs:** Stage 2 Ownership Map. R-series canonical specification for the governing runtime. A0-v1.1.1. D-series documents as applicable.

**Outputs:** Constitutional Comparison Report. For each specification requirement (RS-07 Ownership, RS-10 Managed Objects, RS-11 State, RS-12 Processes, RS-13 Interactions): observed behaviour vs. specified behaviour, and preliminary compliance status (COMPLIANT / PARTIAL / ABSENT / VIOLATED).

**Exit criteria:** Constitutional Comparison Report exists. Every RS-07 ownership requirement has a compliance status. Every RS-13 mandatory interaction has a compliance status.

**Required evidence:** Constitutional Comparison Report filed in `docs/implementation/comparison/`.

### Stage 4: Gap Analysis

**Purpose:** Convert the Constitutional Comparison into an actionable list of gaps.

**Inputs:** Stage 3 Constitutional Comparison Report. I2-APEX-IMPLEMENTATION-LEDGER.md (existing gap records for reference).

**Outputs:** Subsystem Gap Register. For each gap: GAP-NN-NNN identifier, severity (CRITICAL / HIGH / MEDIUM / LOW), description, constitutional basis, proposed remedy type (WRAP / EXTEND / REPLACE / CONFIG), estimated complexity (S/M/L/XL), and wave candidate.

**Exit criteria:** All gaps have severity and remedy type assigned. At least one proposed remedy exists for each CRITICAL gap.

**Required evidence:** Subsystem Gap Register filed in `docs/implementation/gaps/`.

### Stage 5: Migration Plan

**Purpose:** Produce the ordered sequence of implementation steps that will bring the subsystem to constitutional compliance.

**Inputs:** Stage 4 Gap Register. Wave plan (I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md). Prioritization Framework (Part 7).

**Outputs:** Subsystem Migration Plan. Contains: ordered task list (task ID, gap addressed, wave, change class, IDR requirement, dependencies, rollback plan), capability produced by each task, and target certification date.

**Exit criteria:** All CRITICAL and HIGH gaps have at least one corresponding migration task. All tasks have rollback plans. Plan reviewed and approved by Implementation Owner.

**Required evidence:** Subsystem Migration Plan filed in `docs/implementation/plans/`. If any task is Class B or higher, IDR number pre-assigned.

### Stage 6: Implementation

**Purpose:** Execute the migration tasks from the Subsystem Migration Plan.

**Inputs:** Stage 5 Migration Plan. Constitutional object type definitions from `lib/constitutional-types/`.

**Outputs:** Modified or new source files, migrations, route files, and test artefacts. For each task: implementation evidence (validation results, node --check, integration test results).

**Exit criteria:** All migration tasks in the plan are complete. All CRITICAL gaps are resolved. All HIGH gaps are resolved or have approved deferral justification filed as IDRs. All new code passes `node --check`. All existing behaviour preserved (node --check server.js passes; no pre-existing test suite failures).

**Required evidence:** Implementation records for each task. `node --check` evidence. Integration test results. IDR filings for all Class B+ changes.

### Stage 7: Verification

**Purpose:** Verify that the implemented migration actually achieves the constitutional compliance it claims.

**Inputs:** Stage 6 implementation artefacts. Stage 3 Constitutional Comparison Report (used as baseline).

**Outputs:** Verification Report. Re-runs each comparison from Stage 3 against the post-migration state. For each requirement: updated compliance status. New status must be COMPLIANT or ACCEPTABLE PARTIAL. No requirement may have regressed.

**Exit criteria:** All CRITICAL requirements: COMPLIANT. All HIGH requirements: COMPLIANT or ACCEPTABLE PARTIAL with filed deferral justification. No requirement has regressed from Stage 3 baseline. Constitutional boundary checks pass (no prohibited interactions introduced).

**Required evidence:** Verification Report filed in `docs/implementation/verification/`. For each ACCEPTABLE PARTIAL: deferral IDR number.

### Stage 8: Certification

**Purpose:** Formally certify the subsystem as constitutionally adopted.

**Inputs:** All prior stage documents. Stage 7 Verification Report. Constitutional Coverage Score (Part 5).

**Outputs:** Subsystem Passport (Part 4). Constitutional Coverage Score computed. Certification status set to CERTIFIED.

**Exit criteria:** Certification criteria in Part 9 all satisfied. Constitutional Coverage Score ≥ threshold (see Part 5). Subsystem Passport complete and filed.

**Required evidence:** Subsystem Passport filed in `docs/implementation/passports/`. Coverage score recorded. Certification date recorded.

### Stage 9: Operational Monitoring

**Purpose:** Maintain constitutional compliance after certification, and detect drift introduced by subsequent changes.

**Inputs:** Live system behaviour. Constitutional audit records (RT-04 output). Coherence evaluation records (RT-06 output). Any future constitutional amendments (RT-16 output).

**Outputs:** Ongoing compliance attestation. Drift detection reports. Re-certification triggers when amendment or significant change occurs.

**Exit criteria:** None — this stage is continuous and permanent. A certified subsystem is never removed from Stage 9.

**Required evidence:** RT-04 audit records reference the subsystem. RT-06 coherence evaluation covers the subsystem's domain. Amendment broadcasts trigger subsystem re-assessment.

---

## PART 4 — SUBSYSTEM PASSPORT

Every subsystem that reaches Stage 8 of the adoption lifecycle receives a Subsystem Passport. The passport is a living document — it is updated after each migration task, amendment, or certification event.

### 4.1 Passport Template

```
═══════════════════════════════════════════════════════════════
SUBSYSTEM PASSPORT
═══════════════════════════════════════════════════════════════

IDENTITY
───────────────────────────────────────────────────────────────
Subsystem Name:          [Canonical name — matches Atlas entry]
Subsystem ID:            SS-NN (assigned at Stage 0)
Constitutional Owner:    RT-NN — [Runtime canonical name]
Authority Type:          [AIR-N per D6 §4.2–4.3]
Baseline:                APEX-CONSTITUTION-v1.0
Passport Version:        [N.N]
Last Updated:            [YYYY-MM-DD]

CURRENT STATE
───────────────────────────────────────────────────────────────
Current Version:         [Semantic version or commit ref]
Primary Files:           [Comma-separated list of key files]
Lifecycle Stage:         [0 Inventory / 1 Census / 2 Ownership /
                          3 Comparison / 4 Gap Analysis /
                          5 Migration Plan / 6 Implementation /
                          7 Verification / 8 Certification /
                          9 Operational Monitoring]
Certification Status:    [UNCERTIFIED / IN_PROGRESS / CERTIFIED /
                          DRIFT_DETECTED / RE_CERTIFICATION_REQUIRED]
Certification Date:      [YYYY-MM-DD or —]
Certification Wave:      [Wave N or —]
Coverage Score:          [0–100 or —]

CONSTITUTIONAL COVERAGE
───────────────────────────────────────────────────────────────
Ownership Coverage:      [0–3 / description]
Object Compliance:       [0–3 / description]
Invariant Compliance:    [0–3 / description]
Governance Coverage:     [0–3 / description]
Authority Coverage:      [0–3 / description]
Observability:           [0–3 / description]
Runtime Behaviour:       [0–3 / description]
Documentation:           [0–3 / description]
Testing:                 [0–3 / description]
Certification:           [0–3 / description]

CAPABILITY
───────────────────────────────────────────────────────────────
Current Capability:      [What constitutional operations this
                          subsystem currently supports]
Unlocked Capability:     [What becomes possible after adoption]
Capability Gap:          [What this subsystem cannot yet do
                          constitutionally]

COMPLIANCE RECORD
───────────────────────────────────────────────────────────────
Known Violations:        [List of active constitutional violations.
                          NONE if clean.]
Missing Objects:         [Constitutional object types that should
                          be produced but are not.]
Forbidden Interactions:  [Any currently present forbidden
                          interactions per RS-13.3. NONE if clean.]

MIGRATION
───────────────────────────────────────────────────────────────
Migration Complexity:    [S / M / L / XL]
Migration Risk:          [LOW / MEDIUM / HIGH / CRITICAL]
Migration Priority:      [1 (highest) – 5 (lowest)]
Target Wave:             [Wave N]
Active IDRs:             [IDR-NNN list or NONE]
Dependencies:            [Subsystem IDs or Wave tasks that must
                          complete before this subsystem can
                          advance to next stage]

REMAINING WORK
───────────────────────────────────────────────────────────────
Open Gaps:               [GAP-NN-NNN list]
Next Milestone:          [Task or stage]
Estimated Effort:        [S / M / L / XL]

EVIDENCE TRAIL
───────────────────────────────────────────────────────────────
Census Report:           [docs/implementation/census/SS-NN-*.md]
Ownership Map:           [docs/implementation/ownership/SS-NN-*.md]
Gap Register:            [docs/implementation/gaps/SS-NN-*.md]
Migration Plan:          [docs/implementation/plans/SS-NN-*.md]
Verification Report:     [docs/implementation/verification/SS-NN-*.md]
═══════════════════════════════════════════════════════════════
```

### 4.2 Passport Filing Location

All passports are filed at: `docs/implementation/passports/SS-NN-[NAME].md`

Passports are indexed in `docs/implementation/passports/INDEX.md`.

The passport index is a governance artifact. It must be updated within one working session of any certification or status change.

---

## PART 5 — CONSTITUTIONAL COVERAGE MODEL

### 5.1 Purpose

The Constitutional Coverage Model provides a repeatable, quantifiable method for measuring how close a subsystem is to constitutional adoption. It produces a Coverage Score that is comparable across subsystems and across time.

The score supports prioritization, certification threshold enforcement, and drift detection.

### 5.2 Dimensions

Each dimension is scored 0–3. Total possible score: 30. Coverage Score is expressed as a percentage: (total points / 30) × 100.

| Dimension | ID | What It Measures |
|-----------|-----|-----------------|
| Ownership | D-OWN | Whether all subsystem outputs are owned by the correct constitutional runtime |
| Object Compliance | D-OBJ | Whether constitutional object types are produced and consumed where required |
| Invariant Compliance | D-INV | Whether constitutional invariants (RT-NN-INV-N) are enforced |
| Governance | D-GOV | Whether constitutional authority types (AIR-N) govern subsystem operations |
| Authority | D-AUTH | Whether authority certificates are checked and rejected correctly |
| Observability | D-OBS | Whether the subsystem's operations are auditable by RT-04 |
| Runtime Behaviour | D-BEH | Whether the subsystem's outputs match its R-series specification |
| Documentation | D-DOC | Whether constitutional alignment is documented |
| Testing | D-TEST | Whether constitutional compliance is verifiably tested |
| Certification | D-CERT | Whether the subsystem has passed formal certification |

### 5.3 Scoring Rubric

**Score 0 — None:** The requirement is completely absent. No constitutional objects are produced. No invariants are enforced. No authority is checked. No documentation exists.

**Score 1 — Partial:** The requirement is partially met. Some constitutional objects are produced but not all required ones. Some invariants are enforced. Some authority checks exist. Documentation exists but is incomplete or incorrect.

**Score 2 — Substantial:** The requirement is substantially met. Most constitutional objects are produced. Most invariants are enforced. Authority checks cover most operations. Documentation is accurate and mostly complete. The remaining gaps are known and have migration tasks assigned.

**Score 3 — Complete:** The requirement is fully satisfied. All required constitutional objects are produced. All required invariants are enforced. All authority checks are in place. Documentation is accurate, complete, and cross-referenced. All compliance is verified by tests.

### 5.4 Dimension Scoring Criteria

**D-OWN (Ownership)**
- 0: Subsystem outputs owned by wrong runtime or unowned
- 1: Some outputs correctly owned; others misattributed or unowned
- 2: Most outputs correctly owned; one or two misattributions remain
- 3: All outputs owned by correct constitutional runtime with correct authority type

**D-OBJ (Object Compliance)**
- 0: No constitutional object types produced or consumed
- 1: Some constitutional object types produced but not all required ones; or types produced without schema validation
- 2: Most required types produced with schema validation; some optional types missing
- 3: All required constitutional object types produced and schema-validated; `validate()` called before `create()`; all stamped with `__type`, `__runtime`, `__baseline`

**D-INV (Invariant Compliance)**
- 0: No constitutional invariants enforced
- 1: Some invariants enforced but not all; or enforcement is partial (checked but not rejected)
- 2: All critical invariants enforced; non-critical invariants partially enforced
- 3: All invariants from the governing R-series specification enforced with tests

**D-GOV (Governance)**
- 0: Operations occur without constitutional authority governance
- 1: Some operations check authority; others bypass governance
- 2: Most operations check constitutional authority; exceptions documented
- 3: All operations governed by correct AIR-N authority type; no governance bypass

**D-AUTH (Authority)**
- 0: No authority certificates checked; no authority revocation handled
- 1: Authority checked in some paths; revocation not handled
- 2: Authority checked in most paths; revocation handled for critical operations
- 3: Authority certificates checked on every Class A operation; revocation causes immediate operation rejection; authority scope enforced

**D-OBS (Observability)**
- 0: No RT-04 audit record produced for any operation
- 1: RT-04 audit records produced for some operations
- 2: RT-04 audit records produced for all Class A operations
- 3: RT-04 audit records produced for all operations (Class A and B); provenance chain complete; audit records reference operation IDs

**D-BEH (Runtime Behaviour)**
- 0: Subsystem behaviour does not match R-series specification in any meaningful way
- 1: Subsystem behaviour partially matches R-series specification
- 2: Subsystem behaviour substantially matches R-series specification; known deviations documented and have assigned migration tasks
- 3: Subsystem behaviour fully matches R-series specification; verified by integration tests against the spec

**D-DOC (Documentation)**
- 0: No constitutional documentation exists for the subsystem
- 1: Basic documentation exists but is incomplete or inconsistent with the constitutional specification
- 2: Architecture Census, Ownership Map, and Gap Register exist and are current
- 3: All passport fields complete; all documents current; all cross-references to A-series, D-series, and R-series are accurate

**D-TEST (Testing)**
- 0: No tests exist for constitutional compliance
- 1: Some unit tests exist; no integration tests against constitutional requirements
- 2: Unit tests cover critical invariants; integration tests cover at least one RT-03 gate interaction
- 3: Full test coverage of all invariants, authority checks, and object production; falsification tests confirm that violations are rejected

**D-CERT (Certification)**
- 0: Subsystem has not been assessed for certification
- 1: Certification assessment in progress; some criteria not yet met
- 2: All CRITICAL certification criteria met; some HIGH criteria outstanding
- 3: Formal certification issued; all criteria from Part 9 satisfied; passport on file

### 5.5 Coverage Thresholds

| Level | Score Range | Meaning |
|-------|-------------|---------|
| Level 0 — Pre-Constitutional | 0–29% (0–8 pts) | Subsystem unassessed or minimally assessed; no wave assignment |
| Level 1 — Census Complete | 30–49% (9–14 pts) | Architecture understood; gap analysis in progress |
| Level 2 — In Migration | 50–69% (15–20 pts) | Migration tasks in progress; some compliance achieved |
| Level 3 — Substantially Compliant | 70–89% (21–26 pts) | Most requirements met; certification within reach |
| Level 4 — Certified | 90–100% (27–30 pts) | All certification criteria met; monitoring active |

**Certification threshold:** A subsystem may not receive formal certification unless its Coverage Score is ≥ 27 (90%). The only exception is where a constitutional amendment explicitly authorises a lower threshold for a specific subsystem — which requires an IDR and Implementation Owner approval.

### 5.6 Drift Detection

After certification, the Coverage Score is recalculated whenever:

- A change is made to any of the subsystem's primary files.
- A constitutional amendment (RT-16 output) affects the governing R-series specification.
- A coherence violation (RT-06 output) is produced for the subsystem's domain.

If the recalculated score falls below the certification threshold (27/30), the subsystem's certification status changes to DRIFT_DETECTED and re-certification is required before the next constitutional gate passage.

---

## PART 6 — ADOPTION ATLAS

### 6.1 Purpose

The Adoption Atlas is the definitive inventory of all APEX subsystems and their constitutional adoption status. It is:

- The single source of truth for which subsystems exist.
- The navigator for implementation teams deciding what to migrate next.
- The governance record of what has been adopted, by whom, and when.

The Atlas is a living document. New subsystems are added at Stage 0. Stages and scores are updated as adoption progresses.

### 6.2 Atlas Filing Location

`docs/implementation/ADOPTION-ATLAS.md`

The Atlas is updated after every migration task completion and every certification event. It is never more than one completed task out of date.

### 6.3 Atlas Structure

Each entry contains:

| Field | Description |
|-------|-------------|
| ID | SS-NN — assigned at Stage 0 |
| Name | Canonical subsystem name |
| Primary Files | Key source files |
| Owner Runtime | RT-NN |
| Current Stage | 0–9 |
| Coverage Score | 0–100% |
| Migration Priority | 1–5 |
| Target Wave | Wave N |
| Certification Status | UNCERTIFIED / IN_PROGRESS / CERTIFIED |
| Certification Date | YYYY-MM-DD or — |
| Notes | Any known constraints, IDR references |

### 6.4 Initial Atlas — Major Subsystems

The following represents the initial population of the Atlas at the time of Wave 1 completion. All subsystems start at Stage 0 unless Wave 2 or Wave 3 tasks have already assigned them to a higher stage.

Subsystems marked with * are partially adopted by Wave 2/3 tasks already specified in I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md. Their migration tasks are defined there; this Atlas tracks their adoption lifecycle holistically.

---

**CONSTITUTIONAL KERNEL GROUP (RT-03)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-01 | PETL Transaction Engine | lib/runtime/execution-transaction.js | RT-03 | 1 | Wave 2* | PRESERVED artifact; W2-02, W2-05, W2-08 assigned |
| SS-02 | Constitutional Gate Sequence | lib/runtime/constitutional-gate.js | RT-03 | 1 | Wave 2* | 6-gate sequence; W2-04 adds Gate 6 |
| SS-03 | Constitutional Preflight | lib/runtime/constitutional-preflight.js | RT-03 | 2 | Wave 2 | Preflight gate; already partially wired |
| SS-04 | Civilization Kernel Middleware | middleware/civilization-kernel.js | RT-03 | 1 | Wave 2/3 | Loop entry point; W3-03 partly; PRESERVED |

**REALITY FABRIC GROUP (RT-05)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-05 | Reality Fabric | lib/reality/fabric.js | RT-05 | 1 | Wave 2* | PRESERVED; W2-03 adds ChangeRecord |
| SS-06 | Reality Loop | lib/reality/reality_loop.js | RT-05 | 2 | Wave 3 | Constitutional Loop execution engine |
| SS-07 | Write-With-Outbox | lib/write-with-outbox.js | RT-05 | 2 | Wave 3 | RT-05 commit mechanism |

**MEMORY GROUP (RT-07)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-08 | Memory Gateway | lib/memory/gateway.js | RT-07 | 1 | Wave 2* | W2-01 adds getHistoricalState() |
| SS-09 | Memory Governor | lib/memory/memory-governor.js | RT-07 | 2 | Wave 3 | Memory lifecycle governance |
| SS-10 | Working Memory | lib/memory/working-memory.js | RT-07 | 2 | Wave 3 | Active memory store |
| SS-11 | Decision Memory | lib/memory/decision-memory.js | RT-07 | 2 | Wave 3 | Decision history storage |
| SS-12 | Strategic Memory | lib/memory/strategic-memory.js | RT-07 | 2 | Wave 3 | Long-range memory |
| SS-13 | Procedural Memory | lib/memory/procedural-memory.js | RT-07 | 3 | Wave 4 | Skill and procedure storage |
| SS-14 | Database Layer | pg_database.js, pg_helpers.js | RT-07 | 2 | Wave 2 | Postgres persistence; constitutional state backend |

**OBSERVATION GROUP (RT-08)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-15 | Observer Health | lib/observer-health/index.js | RT-08 | 1 | Wave 3* | W3-02 wraps with ObservationRecord |
| SS-16 | Observatory Route | routes/observatory.js | RT-08 | 2 | Wave 3* | W3-02 refactors namespace |

**KNOWLEDGE GROUP (RT-09)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-17 | Knowledge Validator | lib/intelligence/knowledge-validator.js | RT-09 | 1 | Wave 2* | W2-06 wraps output with KnowledgeRecord |
| SS-18 | Truth Injection Contract | lib/learning/truth_injection_contract.js | RT-09 | 2 | Wave 3 | Epistemic protocol enforcement |

**INTELLIGENCE GROUP (RT-10)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-19 | SIE Synthesis Engine | lib/intelligence/sie.js | RT-10 | 1 | Wave 2* | W2-11 wraps output as CUM type |
| SS-20 | Context Composer | lib/intelligence/context-composer.js | RT-10 | 2 | Wave 3 | DUM formation context assembly |
| SS-21 | Graph Reasoning Engine | lib/intelligence/graph-reasoning-engine.js | RT-10 | 3 | Wave 4 | Inference protocol execution |
| SS-22 | Knowledge Graph | lib/memory/knowledge-graph.js | RT-09/RT-10 | 3 | Wave 4 | Shared epistemic graph; ownership boundary TBD at census |

**CIVILIZATION INTELLIGENCE GROUP (RT-11)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-23 | Deliberation and Consensus | civilisation/consensus.js | RT-11 | 1 | Wave 2* | W2-07, W2-11 wire PAIR 32 and compliance gate |
| SS-24 | Decision Intelligence | lib/intelligence/decision-intelligence.js | RT-11 | 2 | Wave 3 | CivilizationalDecisionProposal formation |

**DECISION GROUP (RT-12)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-25 | Decision Lattice | lib/runtime/decision-lattice.js | RT-12 | 1 | Wave 2* | W2-07 wraps output as ComplianceVerificationRecord |
| SS-26 | Governance Manifest | lib/runtime/governance-manifest.js | RT-12 | 2 | Wave 3 | Decision governance record |

**ACTION GROUP (RT-13)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-27 | Execution Context | lib/runtime/execution-context.js | RT-13 | 1 | Wave 2* | W2-08 adds EffectExpectationRecord production |
| SS-28 | Tool Executor | lib/tool-executor.js | RT-13 | 2 | Wave 3 | Action execution with projection tracking |

**REFLECTION GROUP (RT-14)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-29 | Outcome Registry | lib/runtime/outcome-registry.js | RT-14 | 1 | Wave 2* | W2-09 wraps output as ObservedConsequenceRecord |
| SS-30 | Outcome Lineage | lib/runtime/outcome-lineage.js | RT-14 | 2 | Wave 3 | Causal chain tracing |
| SS-31 | Decision Provenance | lib/runtime/decision-provenance.js | RT-14 | 2 | Wave 3 | Consequence attribution |

**COHERENCE GROUP (RT-06)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-32 | Architecture Coherence Layer | lib/orchestration/architecture_coherence_layer.js | RT-06 | 2 | Wave 3 | GCR evaluator predecessor — assess at census |
| SS-33 | Governance State Aggregator | lib/orchestration/governance_state_aggregator.js | RT-06 | 3 | Wave 3 | Constitutional state aggregation |
| SS-34 | Invariant Compiler | lib/runtime/invariant-compiler.js | RT-06 | 2 | Wave 3 | Invariant enforcement rule compilation |

**AUDIT GROUP (RT-04)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-35 | Decision Ledger | lib/audit/decision_ledger.js | RT-04 | 2 | Wave 3 | Audit trail predecessor — wrap as ConstitutionalAuditRecord |
| SS-36 | Governance Traceability | lib/runtime/governance-traceability.js | RT-04 | 2 | Wave 3 | Provenance tracing for governance operations |
| SS-37 | Governance Probe | lib/governance-probe.js | RT-04 | 3 | Wave 4 | Constitutional state inspection |

**IDENTITY GROUP (RT-01)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-38 | Access Controller | lib/memory/access-controller.js | RT-01 | 1 | Wave 3* | W3-03 wraps as ActorProfile |
| SS-39 | Governance Attestation | lib/runtime/governance-attestation.js | RT-01/RT-02 | 2 | Wave 3 | Authority attestation — ownership boundary TBD at census |

**AUTHORITY GROUP (RT-02)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-40 | Governance Module | lib/governance.js | RT-02 | 2 | Wave 3 | Authority governance logic |
| SS-41 | Governance Contract | lib/runtime/governance-contract.js | RT-02 | 2 | Wave 3 | Authority scope enforcement |
| SS-42 | Governance Meta | lib/governance-meta.js | RT-02 | 3 | Wave 4 | Meta-governance registry |

**AMENDMENT GROUP (RT-16)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-43 | Constitution Module | lib/constitution.js | RT-16 | 2 | Wave 3* | W3-01 implements full pipeline |
| SS-44 | Evolution Contract | lib/evolution/evolution_contract.js | RT-16 | 2 | Wave 3 | Amendment contract enforcement |
| SS-45 | Change Admission Gate | lib/evolution/change_admission_gate.js | RT-16 | 2 | Wave 3 | Pre-amendment gate check |

**DOMAIN GROUP (RT-15 × 12)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-46 | Founder Domain | lib/founder/, routes/founder.js | RT-15 | 3 | Wave 4 | Domain-specific understanding contribution |
| SS-47 | Empire Domain | lib/empire/, routes/empire.js | RT-15 | 3 | Wave 4 | Empire health domain |
| SS-48 | Finance Domain | routes/finance.js, routes/wealth.js | RT-15 | 3 | Wave 4 | Finance/wealth domain |
| SS-49 | Intelligence Domain | routes/intelligence.js | RT-15 | 3 | Wave 4 | Intelligence operations domain |
| SS-50 | University Domain | routes/university.js | RT-15 | 4 | Wave 4 | Learning/education domain |
| SS-51 | Life Domains | routes/life.js, routes/nutrition.js, routes/journal.js | RT-15 | 4 | Wave 5 | Personal life domains |
| SS-52 | Social Domains | routes/social.js, routes/communications.js | RT-15 | 4 | Wave 5 | Social/communication domains |
| SS-53 | Professional Domains | routes/career.js, routes/legal.js, routes/travel.js | RT-15 | 4 | Wave 5 | Professional life domains |

**COGNITIVE GROUP (Cross-runtime)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-54 | Cognitive Reasoning Engines | lib/cognitive/ (15+ files) | RT-09/RT-10 | 3 | Wave 4 | Inference and reasoning; ownership census required |
| SS-55 | Strategic Planning Engine | lib/strategic-planning-engine.js | RT-11 | 3 | Wave 4 | Strategic plan formation |
| SS-56 | Executive Arbitration Engine | lib/executive-arbitration-engine.js | RT-12 | 3 | Wave 4 | Executive decision arbitration |

**AGENT SYSTEM GROUP (Deferred)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-57 | Agent System | agent-system/ | RT-01/RT-13 | 3 | Wave 4 | Pre-constitutional execution; deferred per I0-AGENT-SYSTEM-BOUNDARY.md |
| SS-58 | Agent Routes | routes/agents.js | RT-01 | 3 | Wave 4 | Agent API surface |

**INFRASTRUCTURE GROUP (Cross-runtime)**

| ID | Name | Primary Files | Owner | Priority | Target Wave | Notes |
|----|------|--------------|-------|----------|-------------|-------|
| SS-59 | Server and Route Layer | server.js, routes/ (42 files) | Multiple | 2 | Wave 2/3 | API gateway; progressively mounted per wave plan |
| SS-60 | Event Bus | lib/event-bus.js | Cross-runtime | 1 | Wave 2 | Constitutional event delivery channel |
| SS-61 | Storage Layer | storage.js | RT-07 | 2 | Wave 3 | Supabase Storage; RT-07 secondary storage |
| SS-62 | Dashboard | dashboard.html | UI/Multiple | 4 | Wave 5 | Dashboard; no constitutional object ownership |
| SS-63 | Simulation Engine | lib/simulation/scenario_simulator.js | RT-14 | 4 | Wave 5 | Scenario simulation; consequence modelling |
| SS-64 | Certification Engine | lib/certification/execution_certification_engine.js | RT-04 | 3 | Wave 4 | Execution certification predecessor |
| SS-65 | System Integrity Manifest | lib/integrity/system_integrity_manifest.js | RT-04/RT-06 | 3 | Wave 4 | Integrity attestation; ownership boundary TBD at census |

---

## PART 7 — MIGRATION PRIORITISATION FRAMEWORK

### 7.1 Purpose

The framework produces a numeric priority score for each subsystem so that implementation teams have an objective, repeatable method for choosing which subsystem to migrate next when multiple options are available.

The score is advisory. It does not override the wave plan's prescribed order for tasks that are already assigned to a wave. It governs decisions about task sequencing within a wave and subsystem selection for future waves.

### 7.2 Scoring Factors

Each factor is scored 1–5. Total possible score: 40. Higher score = higher priority.

| Factor | ID | Weight | Description |
|--------|-----|--------|-------------|
| Architectural Centrality | F-ARC | × 2 | How many other subsystems depend on this one. A subsystem that blocks many others scores 5. A subsystem with no dependents scores 1. |
| Constitutional Loop Criticality | F-CLC | × 2 | How central this subsystem is to the Constitutional Loop (A1 §12.2). Subsystems that appear in the primary execution path score 5. Peripheral subsystems score 1. |
| Capability Unlocked | F-CAP | × 2 | How much new constitutionally governed capability becomes available after adoption. Subsystems that enable a new RT-03 gate or constitutional object type score 5. |
| Risk of Non-Adoption | F-RISK | × 1 | The risk to constitutional integrity of leaving this subsystem unadopted. A subsystem with active constitutional violations scores 5. A subsystem with no known violations scores 1. |
| Governance Impact | F-GOV | × 1 | Whether adoption of this subsystem enables a new governance check (RT-04 audit, RT-06 coherence evaluation, RT-16 amendment scope). Score 5 if a new governance check becomes possible; 1 if governance is unaffected. |
| Migration Complexity | F-COMP | × -1 | Complexity penalty. XL = 5 (highest penalty), L = 4, M = 3, S = 2, Trivial = 1. Penalises complex migrations to prevent over-investment in single subsystems. |
| User-Visible Value | F-USER | × 1 | Whether adoption of this subsystem produces observable improvement to end-user capability. Score 5 if adoption enables a user-visible feature; 1 if purely internal. |

**Priority Score formula:**
```
Score = (F-ARC × 2) + (F-CLC × 2) + (F-CAP × 2) +
        (F-RISK × 1) + (F-GOV × 1) + (F-USER × 1) -
        (F-COMP × 1)
```

Maximum possible score: (5×2)+(5×2)+(5×2)+(5×1)+(5×1)+(5×1)−(1×1) = 44
Minimum possible score: (1×2)+(1×2)+(1×2)+(1×1)+(1×1)+(1×1)−(5×1) = 4

**Priority tier mapping:**
| Score Range | Priority Tier | Action |
|-------------|--------------|--------|
| 35–44 | Tier 1 — Critical | Migrate in current wave without delay |
| 28–34 | Tier 2 — High | Schedule for current or immediate next wave |
| 20–27 | Tier 3 — Standard | Schedule based on capacity |
| 12–19 | Tier 4 — Deferred | Schedule when higher tiers complete |
| 4–11 | Tier 5 — Low | Schedule when all dependencies clear |

### 7.3 Application of the Framework

The framework is applied:

1. At the start of each wave planning cycle (to populate the wave's task list).
2. When a new subsystem is identified (to assign it an initial priority tier).
3. When a blocking dependency is resolved (to re-score subsystems that were waiting for it).
4. When an IDR resolves a conflict between competing migration candidates.

The priority score is recorded in the Subsystem Passport (Migration Priority field) and the Adoption Atlas.

---

## PART 8 — CAPABILITY-DRIVEN DEVELOPMENT

### 8.1 The Capability Commitment

Every implementation task in the APEX constitutional programme must be justifiable in terms of capability — specifically, what new constitutional capability becomes available as a direct result of completing the task.

"Reducing debt" is not a capability. "Moving towards compliance" is not a capability. A capability is a concrete, observable operational behaviour that was not possible before the task and is possible after it.

### 8.2 Capability Categories

**Category 1: New Constitutional Object Production**
A subsystem that previously produced no constitutional objects now produces at least one. The constitutional record gains new provenance entries. Example: W2-03 (ChangeRecord production in advanceClaim()) — after completion, every Reality Fabric stage transition creates a provenance-anchored record traceable through RT-03.

**Category 2: New Constitutional Gate Enforcement**
A gate in the constitutional sequence that previously did not enforce a constitutional invariant now does. The Constitutional Loop gains tighter correctness guarantees. Example: W2-04 (Gate 6 Temporal Integrity) — after completion, operations with stale objects are rejected by the gate.

**Category 3: New Cross-Runtime Interaction**
A constitutional PAIR interaction that was previously absent or informal now operates over constitutional channels with typed objects. Example: W2-11 (PAIR 32: SIE → consensus) — after completion, the CUM delivery from RT-10 to RT-11 is formally typed and auditable.

**Category 4: New Audit Coverage**
A subsystem previously invisible to RT-04 audit now produces audit records. Example: W3-02 (RT-08 Observation Boundary) — after completion, every external datum entering the Constitutional Loop is recorded in an ObservationRecord and auditable.

**Category 5: New Domain Coverage**
A domain-specific subsystem (RT-15 instance) now contributes typed domain understanding to the CUM synthesis process. Example: Wave 4 Founder domain adoption — after completion, Founder domain knowledge flows through the constitutional epistemic chain.

**Category 6: New Self-Governance**
The system gains a new ability to detect, report, or correct its own constitutional deviation. Example: W3-01 (Amendment Pipeline) — after completion, constitutional changes are formally governed rather than informally applied.

### 8.3 Capability Mapping Template

Every migration task should be documented with the following capability statement before implementation begins:

```
CAPABILITY STATEMENT FOR [TASK-ID]
Before: [Description of what is currently not possible]
After:  [Description of what becomes possible after this task]
Category: [Category 1–6 from §8.2]
Evidence: [How the capability gain will be measured — test,
           audit record, route response, etc.]
```

Capability statements are part of the IDR filing for Class B+ tasks.

### 8.4 Constitutional Work and User-Visible Capability

The constitutional programme and user-visible capability development are not in opposition. They are the same programme at different layers.

The pattern is:

1. Wave 1 (Type Foundation) → Provides the schema vocabulary. No user-visible change.
2. Wave 2 (Constitutional Wiring) → Connects schema to runtime. Audit trail becomes real. Gates become enforced. No dramatic user-visible change, but correctness improves.
3. Wave 3 (Missing Runtimes) → New subsystems come online. RT-08 boundary means all external data is now provenance-tracked. RT-16 amendment pipeline means constitutional changes are governed. Small user-visible improvements (better consistency guarantees, traceable decisions).
4. Wave 4 (Agent and Domain Adoption) → Agent behaviour becomes constitutionally governed. Domain intelligence flows through the constitutional chain. User-visible: more coherent, traceable, correctable AI behaviour.
5. Wave 5 (Self-Auditing) → System reports its own constitutional state to users. Drift detection active. Constitutional health dashboard. User-visible: transparency and trust.

The constitutional programme does not pause user-facing feature development. It progressively makes that feature development constitutionally safe.

---

## PART 9 — DEFINITION OF "CONSTITUTIONALLY ADOPTED"

### 9.1 Certification Criteria

A subsystem is constitutionally adopted if and only if all of the following criteria are satisfied:

**CERT-01: Ownership Established**
The subsystem is assigned to exactly one primary constitutional runtime owner (RT-NN). All outputs of the subsystem are produced under the authority of that runtime's authority type (AIR-N). The assignment is documented in the Subsystem Passport and traceable to the governing A0-v1.1.1 section.

**CERT-02: No Prohibited Interactions**
The subsystem does not perform any interaction listed in its governing R-series RS-13.3 (Forbidden Interactions). Specifically: no Projection Boundary crossing, no RT-03 gate bypass, no RT-04 audit block, no unauthorized rollback initiation, no authority claim without delegation.

**CERT-03: Required Objects Produced**
All constitutional object types listed in the subsystem's governing R-series RS-07 (Ownership) that are designated as "Owned" by the runtime are produced by this subsystem when their production conditions are met. Each object is schema-validated before persistence (`validate()` called; `create()` stamps `__type`, `__runtime`, `__baseline`).

**CERT-04: Constitutional Invariants Enforced**
All invariants listed in the subsystem's governing R-series specification (RT-NN-INV-N) are enforced by the subsystem's implementation. Enforcement means: the invariant is checked, and violations cause the operation to fail or the appropriate fault record to be produced. Invariants are not "best effort" — they are hard constraints.

**CERT-05: Mandatory Interactions Wired**
All mandatory interactions listed in the subsystem's governing R-series RS-13.1 (Mandatory Interactions) are implemented. Each PAIR interaction has a typed object flowing through the correct channel (Class A via RT-03 KMP, or Class B as specified).

**CERT-06: RT-04 Audit Coverage**
The subsystem produces `ConstitutionalAuditRecord` entries (or causes RT-04 to produce them on its behalf) for all Class A operations. Audit records are not produced by the subsystem itself — RT-04 audits the subsystem. The certification criterion is that RT-04 can observe all Class A operations and that no operations escape the audit perimeter.

**CERT-07: RT-03 Gate Compliance**
All constitutional object types committed by this subsystem pass through the RT-03 KMP gate sequence. No Class A commitment bypasses the gate. Gate denials cause the operation to fail and produce a `RejectionRecord`.

**CERT-08: Rollback Compliance**
The subsystem responds correctly to RT-03 rollback directives (RC-1 through RC-4 per A1). Specifically: RT-10 reverts DUM updates when Knowledge Records are revoked; RT-09 reverts KnowledgeState when Evidence is revoked; etc. The correct rollback handler is implemented and tested.

**CERT-09: Boundary Compliance**
The subsystem respects the boundary between its constitutional runtime and neighbouring runtimes. It does not take ownership of objects it does not own. It does not initiate interactions that are constitutionally forbidden. Cross-runtime references are references only — not ownership claims.

**CERT-10: Documentation Complete**
The Subsystem Passport is complete and current. Architecture Census, Ownership Map, Gap Register, Migration Plan, and Verification Report all exist and are accurate as of the certification date. All constitutional discrepancies (if any) are documented with dispositions.

**CERT-11: Coverage Score ≥ 27/30 (90%)**
The Constitutional Coverage Score computed using the model in Part 5 is at least 27 out of 30 (90%). No individual dimension score is 0.

**CERT-12: No Open CRITICAL or HIGH Gaps**
The Subsystem Gap Register contains no CRITICAL or undeferred HIGH gaps. All CRITICAL gaps are resolved. HIGH gaps are either resolved or have an approved IDR deferral with a specific target wave.

**CERT-13: Tests Verified**
The subsystem's constitutional compliance is verified by at least one integration test per CERT-03 and CERT-04 criterion. Tests are not aspirational — they are in the test suite and passing at the time of certification.

### 9.2 Partial Certification

There is no partial certification. A subsystem either satisfies all 13 criteria and is CERTIFIED, or it does not satisfy all 13 criteria and is IN_PROGRESS (or lower stage).

The term "partially adopted" is acceptable as an informal description of a subsystem that is progressing through the lifecycle. It is not a formal status.

### 9.3 Certification Expiry

Certification does not expire on a fixed schedule. It remains valid until one of the following triggers occurs:

- A constitutional amendment (RT-16 output) modifies the governing R-series specification in a way that affects one or more certification criteria.
- A code change to the subsystem's primary files causes its Coverage Score to fall below 27/30.
- A RT-06 coherence violation is raised for the subsystem's domain and attributed to a constitutional compliance failure.
- A RT-04 audit record identifies a prohibited interaction or invariant violation in the subsystem.

When any trigger fires, the subsystem's certification status changes to DRIFT_DETECTED. The subsystem must be re-certified against the updated requirements before the next constitutional gate passage.

---

## PART 10 — GOVERNANCE

### 10.1 Authoritative Documents

The following documents are authoritative for constitutional adoption governance, in descending order of authority:

| Priority | Document | Governs |
|----------|----------|---------|
| 1 | A0-v1.1.1-canonical.md | Runtime identity, constitutional seat, ownership |
| 2 | D-series documents (D0–D8) | Constitutional principles, invariants, gate sequence, authority types |
| 3 | R-series specifications (R1–R16) | Per-runtime ownership, objects, interactions, lifecycle |
| 4 | A1-v1.2-canonical.md | PAIR interactions, execution order, loop structure |
| 5 | I2-IMPLEMENTATION-GOVERNANCE-MODEL.md | Governance process, IDR procedure, change classes |
| 6 | I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md | Wave task order, gate criteria |
| 7 | I2-APEX-IMPLEMENTATION-LEDGER.md | Task state, gap records |
| 8 | This document (APEX-CONSTITUTIONAL-ADOPTION-STRATEGY.md) | Adoption strategy, atlas, prioritisation |
| 9 | Subsystem Passports | Per-subsystem certification state |
| 10 | Adoption Atlas | Subsystem inventory and status |

When any conflict arises between documents at different priority levels, the higher-priority document governs. Conflicts between documents at the same priority level require an IDR.

### 10.2 How Migration Decisions Are Recorded

Every migration decision that changes the system's constitutional compliance state is recorded as one or more of the following:

**IDR (Implementation Decision Record):** Required for all Class B+ tasks (per I2-IMPLEMENTATION-GOVERNANCE-MODEL.md Part 5). IDRs record: the decision, its constitutional basis, options considered, the selected approach, and the approving authority. IDRs are filed in `docs/constitutional-architecture/` following the existing IDR numbering sequence.

**Atlas Update:** The Adoption Atlas is updated after every migration task completion.

**Passport Update:** The relevant Subsystem Passport is updated after every migration task completion, gap closure, or certification event.

**Ledger Update:** I2-APEX-IMPLEMENTATION-LEDGER.md is updated after every task completion, following its existing Update Rule.

**Wave Plan Update:** I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md is updated after task status changes, following its existing format.

### 10.3 Relationship to IDRs

IDRs are the governance mechanism for decisions that deviate from, extend, or clarify the approved task plan. The adoption strategy does not replace IDRs — it operates alongside them.

Specifically:

- When the prioritisation framework (Part 7) recommends migrating a subsystem not yet in the wave plan, an IDR must be filed to authorise the wave assignment before implementation begins.
- When a census (Stage 1) reveals that a subsystem's constitutional ownership is ambiguous, an IDR is filed to resolve the ambiguity before the Ownership Map (Stage 2) is completed.
- When a gap analysis (Stage 4) reveals a constitutional violation that cannot be remedied by wrapping alone (requiring replacement), an IDR is filed before the migration plan is drafted.
- When a verification (Stage 7) reveals that a post-migration compliance score is below the certification threshold, an IDR is filed to document the shortfall and the remediation plan.

### 10.4 Relationship to Wave Planning

The wave plan (I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md) governs implementation order. The adoption strategy does not change wave order, wave task assignments, or gate criteria.

The adoption strategy operates in the space between the wave plan's prescribed tasks:

- It explains the *why* behind the ordered tasks.
- It provides a methodology for tasks not yet assigned to a wave.
- It provides the certification criteria that determine when a wave's migration work is complete.
- It provides the Atlas that makes explicit which subsystems exist but have not yet been assigned to a wave.

A wave is not complete when its prescribed tasks are complete. A wave is complete when all required subsystems reach their target adoption stage, all gate criteria are satisfied, and all IDRs from that wave are closed.

### 10.5 Relationship to Certification

Wave tasks produce implementation artefacts. Certification is the act of formally verifying that those artefacts satisfy the adoption criteria in Part 9.

Certification occurs at Stage 8 of the adoption lifecycle, after the implementation (Stage 6) and verification (Stage 7) are complete. It is not a gate in the wave plan — it is a separate governance event that may be filed concurrently with or shortly after the wave's implementation tasks close.

A subsystem that completes all its wave tasks but does not satisfy CERT-01 through CERT-13 is not constitutionally adopted. The gap between task completion and certification is closed by additional verification work, not by re-declaring the tasks complete.

---

## PART 11 — REPOSITORY EVOLUTION

### 11.1 Overview

The APEX repository evolves through four stages. Each stage is a qualitative transition in the relationship between the existing code and the constitutional architecture.

```
Stage 1: Legacy Runtime
    ↓ (Wave 1 — Constitutional Object Type Foundation)
Stage 2: Hybrid Runtime
    ↓ (Wave 2 — Constitutional Wiring)
    ↓ (Wave 3 — Missing Runtimes)
Stage 3: Constitutionally Governed Runtime
    ↓ (Wave 4 — Agent and Domain Adoption)
    ↓ (Wave 5 — Self-Auditing Completion)
Stage 4: Self-Auditing Runtime
```

### 11.2 Stage 1: Legacy Runtime (Current — during Wave 1)

**Characteristics:**
- Constitutional object types exist in `lib/constitutional-types/` but are not connected to any runtime behaviour.
- The existing runtime operates without constitutional governance.
- `lib/runtime/execution-transaction.js`, `lib/reality/fabric.js`, and other preserved artifacts run correctly but produce no constitutional objects.
- RT-04 audit coverage: zero. No audit records produced.
- RT-06 coherence evaluation: zero. No GCR checks.
- Constitutional Loop: defined in constitutional documents, not yet operational.

**What exists:** Constitutional vocabulary (types). Engineering implementation (logic). No bridge between them.

**Capability:** The runtime functions. Constitutional governance does not yet function.

**How Stage 1 ends:** Gate 2 PASS. All constitutional object types defined, loadable, and collision-free. Wave 1 complete.

### 11.3 Stage 2: Hybrid Runtime (Wave 2 and Wave 3)

**Characteristics:**
- Constitutional object types are being progressively wired into existing runtime behaviour.
- Some operations produce constitutional objects; others do not.
- The Constitutional Loop is operational for wired subsystems; unwired subsystems still operate outside constitutional governance.
- RT-04 audit coverage: partial. Wired Class A operations produce audit records; unwired operations do not.
- RT-06 coherence evaluation: partial. GCR evaluator is operational (W2-10) but only evaluates wired operations.
- RT-08 Observation Boundary: operational (W3-02) — all external data entering the wired path is provenance-tracked.
- RT-16 Amendment Pipeline: operational (W3-01) — constitutional changes are formally governed.

**What exists:** Constitutional vocabulary AND a partially operational constitutional governance layer. Pre-constitutional code and constitutionally governed code run side by side.

**Risk in Stage 2:** It is possible for a wired and an unwired subsystem to interact in a way that bypasses constitutional governance. The Observation Boundary (W3-02) and the gate sequence (W2-04) are the primary protection against this. Monitoring is essential.

**Capability:** The system can produce a constitutional provenance record for operations that pass through wired paths. The amendment pipeline governs constitutional changes. Audit records exist for wired operations.

**How Stage 2 ends:** Gate 4 PASS (Wave 3 complete). Full Constitutional Loop end-to-end. RT-16 pipeline operational. All Wave 3 subsystems migrated.

### 11.4 Stage 3: Constitutionally Governed Runtime (Wave 4 and Wave 5)

**Characteristics:**
- All major subsystems are constitutionally wired or explicitly boundary-declared (deferred).
- The Constitutional Loop is fully operational end-to-end.
- Every Class A operation that enters the loop produces constitutional objects, passes through all 6 RT-03 gates, and produces an RT-04 audit record.
- The agent system has been adopted (Wave 4) — agent operations are Class A constitutional operations.
- All 12 domain RT-15 instances contribute typed domain understanding to CUM synthesis.
- RT-06 coherence evaluation is comprehensive — all domain coherence states are evaluated.
- The amendment pipeline is live — constitutional evolution is self-governing.

**What exists:** A runtime that is substantially governed by its own constitution.

**Capability:** Constitutional authority, provenance, and audit coverage are comprehensive. External auditors can verify constitutional compliance by examining the constitutional object records without reading the source code.

**How Stage 3 ends:** All Wave 4 and Wave 5 tasks complete. All subsystem certifications issued. Coverage Score ≥ 90% across all certified subsystems.

### 11.5 Stage 4: Self-Auditing Runtime (Post Wave 5)

**Characteristics:**
- RT-04 audit runtime produces constitutional compliance reports automatically.
- RT-06 coherence evaluation detects drift and triggers re-certification.
- RT-16 amendment pipeline manages its own constitutional evolution.
- The system can answer the question "Is this operation constitutionally compliant?" at runtime, not just post-hoc.
- The constitutional architecture is the system's primary governance mechanism — not its documentation.

**What exists:** A system that audits itself, detects its own constitutional violations, and initiates its own correction through the amendment pipeline.

**Capability:** Self-governance. The constitution is not just a document — it is a runtime authority.

**What this stage does NOT mean:** The system does not become fully autonomous in its constitutional governance. Class I amendments still require human authorization (D7 §12.2). RT-04 audits are still human-readable and human-reviewable. The constitution still governs; it does not replace human judgment.

### 11.6 Repository File Structure Evolution

The repository structure evolves alongside the runtime stages:

**End of Stage 1 (Wave 1 complete):**
```
lib/constitutional-types/     ← 83 types defined (Wave 1 complete)
docs/constitutional-architecture/  ← A/D/R/I series documents
docs/implementation/          ← Strategy, Atlas, passports (this wave)
```

**End of Stage 2 (Wave 3 complete):**
```
lib/constitutional-types/     ← Complete type registry
lib/runtime/                  ← PETL, gates (constitutionally wired)
lib/reality/                  ← Reality Fabric (constitutionally wired)
lib/memory/                   ← Memory gateway (constitutionally wired)
lib/knowledge/                ← Knowledge layer (new in W2-06)
lib/decision/                 ← Decision compliance gate (new in W2-07)
lib/action/                   ← Effect expectation (new in W2-08)
lib/reflection/               ← Consequence records (new in W2-09)
lib/coherence/                ← GCR evaluator (new in W2-10)
lib/observation/              ← Observation boundary (new in W3-02)
lib/identity/                 ← Identity module (new in W3-03)
lib/amendment/                ← Amendment pipeline (new in W3-01)
docs/implementation/passports/  ← Subsystem passports (Stage 2+)
docs/implementation/census/   ← Architecture census reports
```

**End of Stage 3 (Wave 5 complete):**
```
[All of Stage 2 plus:]
lib/cognitive/                ← Cognitive engines (constitutionally wired)
agent-system/                 ← Constitutional agent execution
lib/founder/, lib/empire/     ← Domain subsystems (constitutionally wired)
docs/implementation/          ← Complete passport and atlas library
```

---

## PART 12 — FUTURE VISION

### 12.1 The Long-Term Operating Model

The long-term operating model is a runtime that governs its own evolution through the same constitutional framework that governs its operations. This model has five dimensions:

**1. Architecture Authority**
The constitutional architecture — specifically the A0 runtime specifications, D-series principles, and R-series canonical specifications — becomes the definitive source of truth for architectural decisions. New features are designed against the constitutional architecture, not in spite of it. An engineer asking "how should this work?" consults the R-series specification for the relevant runtime, not an ad hoc design meeting.

**2. Migration Authority**
Constitutional adoption (this document) becomes the standard process for any new subsystem or significant code change. The wave plan, IDR process, and passport system are not exceptional governance — they are the routine engineering process. Migration is not a special programme; it is how the system evolves.

**3. Runtime Authority**
The Constitutional Loop is the primary execution path for all Class A operations. No significant operation bypasses the loop. The 6 RT-03 gates are the standard entry point for all committed operations. This is not a performance constraint — it is the guarantee of correctness that makes the system trustworthy.

**4. Certification Authority**
RT-04 produces continuous, automatic constitutional compliance records. These records are the evidence basis for external certification. No manual audit report is needed to assert constitutional compliance — the audit records prove it. Any subsystem that cannot produce RT-04 audit evidence is, by definition, not constitutionally compliant.

**5. Drift Detection Authority**
RT-06 coherence evaluation, running continuously, detects and reports deviations from constitutional coherence in real time. Constitutional drift — where code changes over time move the system away from constitutional compliance — is detected within one constitutional loop cycle, not at the next manual audit.

### 12.2 What the Constitution Should NOT Become

The constitution should not become an implementation bottleneck. The risk in any constitutional programme is that governance overhead exceeds engineering velocity — that teams spend more time filing IDRs than writing code, more time on certification than on delivery.

This risk is mitigated by:

**Proportionality:** Class D changes (documentation, type definitions, configuration) require no IDR. Class B changes require an IDR but can proceed immediately after filing. Only Class A changes (constitutional modifications) require prior approval. Most engineering work is Class B or D.

**Automation:** Constitutional object type validation is automatic (`validate()`, `create()`). Coverage scoring is computable from code analysis. Audit record production is an implementation pattern, not a human review step. The overhead of constitutional compliance decreases as the tooling matures.

**Incremental certification:** Subsystems do not need to be fully adopted before they can be used. The adoption lifecycle explicitly supports partial compliance (Levels 1–3) while work continues toward certification. A subsystem at Level 2 is better than an uncertified subsystem — it is not blocked from use.

**Wave containment:** The wave plan contains the scope of constitutional adoption work. Wave N does not expand into Wave N+1 scope. Scope creep in constitutional adoption is a governance failure, not an engineering necessity.

### 12.3 The Constitution as a Living Document

APEX-CONSTITUTION-v1.0 is frozen. The implementation era is governed by that frozen baseline. But the constitution itself is not permanently frozen — RT-16 is the amendment runtime, and the amendment pipeline is designed to allow the constitution to evolve while maintaining consistency with its own principles.

The long-term operating model anticipates that:

- Constitutional amendments will be proposed by RT-11 deliberation (not by engineers directly).
- Amendments will be classified (Class I–IV), deliberated, and ratified through the RT-16 pipeline.
- Ratified amendments will trigger automatic re-assessment of affected subsystem certifications.
- The constitutional architecture will evolve to accommodate new domains, new runtime requirements, and new capability needs.

The adoption strategy in this document should be regarded as the first iteration of an evolving governance framework. As constitutional amendments are ratified, this strategy document may be updated under the same amendment governance that governs constitutional changes. Updates to this document that do not modify constitutional authority, runtime identities, or wave order may be made by the Implementation Owner without an IDR, provided the change is recorded in the Adoption Atlas and annotated in the document.

---

## PART 13 — CONSISTENCY AUDIT

*This section records the result of the post-writing falsification and consistency audit.*

### 13.1 Constitutional Conflict Check

| Check | Verdict | Notes |
|-------|---------|-------|
| No new constitutional authority created | PASS | All authority references trace to existing D6, A0, R-series documents |
| No A-series modification | PASS | A0 and A1 are cited only as sources; not amended |
| No D-series modification | PASS | D-series documents cited only as sources |
| No R-series modification | PASS | R-series specifications cited only as sources |
| No new runtime identities created | PASS | All RT-NN references are pre-existing runtime IDs from A0-v1.1.1 |
| No constitutional objects invented | PASS | No new constitutional object types defined; existing types referenced |
| CUM ownership boundary respected | PASS | Part 6 Atlas correctly assigns CUM to RT-11, not RT-10; SS-19 notes W2-11 wraps as CUM type delivered to RT-11 |
| RT-04 audit independence preserved | PASS | Certification model correctly states that subsystems do not self-audit; RT-04 audits them |
| Gate sequence not modified | PASS | 6-gate sequence referenced as given; no new gate added by this document |
| Constitutional Loop structure not modified | PASS | Loop cited as existing; no structural changes proposed |

### 13.2 Governance Conflict Check

| Check | Verdict | Notes |
|-------|---------|-------|
| Wave 1 order not changed | PASS | Wave 1 tasks not reordered; W1-09 remains the next task after W1-08 |
| Wave 2 order not changed | PASS | Wave 2 critical path (W2-01→W2-02→W2-03→W2-04→W2-05→W2-10) not modified |
| Wave 3 order not changed | PASS | Wave 3 tasks not reordered |
| Gate criteria not modified | PASS | Gate 2, 3, 4 criteria cited from wave plan; not modified by this document |
| IDR process not modified | PASS | IDR process cited from I2-IMPLEMENTATION-GOVERNANCE-MODEL.md; not redefined |
| Task states not changed | PASS | No task state modified; document is strategic only |
| Ledger not modified | PASS | Ledger cited as authoritative; document does not alter ledger entries |

### 13.3 IDR Conflict Check

| Check | Verdict | Notes |
|-------|---------|-------|
| IDR-001 (canonical path) | PASS | Path lib/constitutional-types/ referenced correctly throughout |
| IDR-002 (W2-01 new method) | PASS | W2-01 referenced correctly; IDR-002 noted as required |
| IDR-003 (ConsequenceObservationRecord ownership) | PASS | Option A (RT-08 owns) correctly reflected in Atlas; SS-16 assigned to RT-08 |
| IDRs 004–016 noted in wave plan | PASS | Wave 2 and 3 IDR numbers referenced as per wave plan |

### 13.4 Falsification Attempts

The following attempts were made to find strategic weaknesses. Results are recorded.

**FA-1: "The prioritisation framework overrides the wave plan and could be used to reorder Wave 2 tasks."**
*Verdict: Refuted.* Part 7.3 explicitly states: "The score is advisory. It does not override the wave plan's prescribed order for tasks that are already assigned to a wave." Wave 2 tasks are assigned to Wave 2. The framework governs tasks not yet in a wave and sequencing decisions within a wave's unordered parallel tasks.

**FA-2: "The subsystem atlas assigns subsystems to owners without authority — it could conflict with census findings."**
*Verdict: Partially valid; mitigated.* The Atlas entries are tentative at Stage 0 — they reflect the analyst's initial assessment. Stage 2 (Ownership Mapping) is specifically designed to formally resolve ownership through R-series consultation and IDR filing for conflicts. The Atlas header notes for SS-22 (Knowledge Graph), SS-39 (Governance Attestation), and SS-65 (System Integrity Manifest) already flag ownership as "TBD at census." The lifecycle ensures that tentative Atlas assignments are formally verified before they govern implementation. No Atlas entry has constitutional force — only the IDR-resolved Ownership Map does.

**FA-3: "The certification criteria could block a Wave 2 task from being declared complete if the subsystem doesn't reach CERT-11 (90% coverage score)."**
*Verdict: Refuted by design.* Wave tasks (W2-01 through W2-12) are task completions — they are not subsystem certifications. A task is complete when its prescribed steps are done and its validation criteria pass. Subsystem certification (Stage 8) occurs after multiple tasks have contributed to a subsystem's adoption lifecycle. A subsystem may be at Level 2 (In Migration, 50–69%) when Wave 2 tasks complete — and this is constitutionally acceptable. Certification is a separate governance event from task completion.

**FA-4: "The Coverage Model's 10-dimension scoring could conflict with a subsystem that has no D-series invariants — it would score 0 in D-INV through no fault of the implementation."**
*Verdict: Valid edge case; disposition recorded.* A subsystem for which its governing R-series specification defines no invariants (unusual but possible) would score 3 in D-INV automatically — because the requirement "all invariants enforced" is trivially satisfied when the invariant set is empty. The scoring rubric's "Score 3: All required invariants enforced" applies to an empty required set. No amendment to the coverage model needed; edge case is handled by the rubric's logic.

**FA-5: "The 'Self-Auditing Runtime' vision could be interpreted as giving RT-06 or RT-04 amendment authority, which would conflict with the constitutional amendment pipeline (RT-16 owns amendment authority)."**
*Verdict: Refuted.* Part 12.1 explicitly states that RT-16's amendment pipeline manages constitutional evolution. RT-04 and RT-06 produce compliance and coherence records, respectively — they do not amend the constitution. The drift detection mechanism triggers re-certification, not amendment. Amendment authority is RT-16's alone per A0-v1.1.1 §3.16 and D7 Part 12.

**FA-6: "The lifecycle Stage 9 (Operational Monitoring) has no exit criteria — a certified subsystem could drift indefinitely without consequence."**
*Verdict: Refuted.* Part 9.3 (Certification Expiry) defines four explicit triggers that change certification status from CERTIFIED to DRIFT_DETECTED. DRIFT_DETECTED status requires re-certification before the next constitutional gate passage. Stage 9 is permanent and continuous, but it is not consequence-free — it is the detection layer that triggers the re-certification process.

**FA-7: "The Atlas lists RT-15 domain subsystems (SS-46 through SS-53) as targeting Waves 4–5, but the wave plan does not include Wave 4 or 5 tasks. This could create planning gaps."**
*Verdict: Valid planning tension; disposition recorded.* The wave plan (I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md) explicitly states: "Do not execute Wave 4 or Wave 5 under this wave plan. Those waves are covered in I2-APEX-IMPLEMENTATION-LEDGER.md and require Gate 4 passage first." The Atlas target wave assignments for SS-46 through SS-65 are aspirational planning entries — they are not authorised wave assignments. They become authorised only after Gate 4 PASS and the production of a Wave 4/5 wave plan document, following the same governance process used for Wave 1–3. The Atlas entries are correctly marked as wave targets, not wave assignments.

### 13.5 Residual Weaknesses

One structural weakness remains after falsification:

**Ownership boundary disputes for cross-runtime subsystems** (SS-22, SS-39, SS-54, SS-65): The Atlas correctly flags these with "TBD at census." However, the census and ownership mapping process requires R-series consultation and may require IDR filing. If the census reveals that a large multi-file subsystem (e.g., `lib/cognitive/` — 15+ files) has ambiguous ownership spanning multiple runtimes, the ownership mapping process could take multiple IDR cycles. This is an inherent complexity in the migration of a large pre-existing codebase to a constitutional architecture.

**Disposition:** This weakness is acknowledged and managed by the lifecycle design. Stage 2 (Ownership Mapping) includes a specific exit criterion: "No interface is unowned. Conflicts between proposed owners are resolved and documented." The multi-file cognitive subsystem (SS-54) is specifically flagged as requiring a census to determine RT-09/RT-10 ownership boundaries. The adoption strategy does not eliminate this complexity — it provides the governance process to resolve it.

---

## PART 14 — FINAL REPORT

### 14.1 Capability Impact

This strategy document enables:

1. A measurable, quantified path from the current pre-constitutional runtime state to full constitutional adoption.
2. A repeatable certification process that removes ambiguity about whether a subsystem is "done."
3. A priority framework that ensures the highest-value migrations happen before lower-value ones.
4. An atlas that makes visible the full scope of what needs to be adopted, preventing scope surprises in future waves.
5. A capability commitment framework that keeps constitutional work connected to user-visible outcomes.

### 14.2 Engineering Impact

This document does not change any code. It changes how future code changes are planned, prioritised, and verified.

Specific engineering changes enabled by this document:

- Implementation teams can now assign a wave candidate to any subsystem in the Atlas using the prioritisation framework — without waiting for another strategy document.
- Implementation teams have a standard passport template that eliminates ad hoc documentation per subsystem.
- Implementation teams have a coverage model that produces a single, comparable number for each subsystem's constitutional compliance — enabling data-driven prioritisation.
- Implementation teams have a formal certification criteria list (13 criteria) — eliminating disputes about whether a subsystem is "constitutionally complete."

### 14.3 Risk Assessment

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| Coverage model scores drift from actual compliance | MEDIUM | MEDIUM | Stage 9 mandates re-scoring on every primary file change |
| Atlas becomes stale after several waves | MEDIUM | LOW | Atlas update rule: within one working session of any task completion |
| Prioritisation framework overrides critical wave plan order | LOW | HIGH | Part 7.3 explicitly limits framework scope to unassigned and parallel tasks |
| Certification criteria bar too high — blocks legitimate completions | LOW | MEDIUM | CERT criteria are derived directly from R-series specifications; they are the same bar as the constitution itself |
| Ownership boundary disputes delay Wave 4 migrations | HIGH | MEDIUM | Stage 2 and IDR process provide structured resolution; disputes are governance events, not blockers |

### 14.4 Migration Impact

This document creates the following new governance artifacts that will be produced as migration progresses:

- `docs/implementation/ADOPTION-ATLAS.md` — Subsystem inventory (to be created as first post-strategy action)
- `docs/implementation/passports/INDEX.md` — Passport index
- `docs/implementation/census/` — Architecture census reports
- `docs/implementation/ownership/` — Ownership maps
- `docs/implementation/gaps/` — Subsystem gap registers
- `docs/implementation/plans/` — Subsystem migration plans
- `docs/implementation/verification/` — Verification reports
- `docs/implementation/passports/` — Subsystem passports

None of these artifacts need to exist before Wave 2 begins. They are produced progressively as subsystems advance through the adoption lifecycle.

### 14.5 Governance Impact

This document:
- Becomes the governing reference for post-Wave-1 adoption decisions.
- Subordinates itself to the constitutional authority chain (Part 10.1).
- Does not create new authority — it records the strategic intent of the implementation programme under existing authority.
- Does not displace the IDR process, the wave plan, or the ledger.

### 14.6 Implementation Impact

This document has no immediate implementation impact. It does not add code, does not modify code, and does not change the Wave 1 or Wave 2 task order.

Its implementation impact is prospective: it makes every future implementation decision traceable to a strategy, and every strategy decision traceable to a constitutional authority.

### 14.7 Expected Effect on Wave 2

Wave 2 is unaffected in its task order or gate criteria. The adoption strategy:

- Confirms that Wave 2 tasks (W2-01 through W2-12) advance the following subsystems through the adoption lifecycle: SS-01, SS-02, SS-05, SS-08, SS-17, SS-19, SS-23, SS-25, SS-27, SS-29, SS-60 and others.
- Provides the passport template that will be used to certify these subsystems after Wave 2 completes.
- Identifies the subsystems not yet assigned to Wave 2 or Wave 3 (SS-20 through SS-24, SS-30 through SS-53) — these will be prioritised using Part 7 when Wave 4 planning begins.

### 14.8 Expected Effect on Future Development

Starting from Wave 4:

- New feature development requests will be processed against the Atlas. Any new code that implements a capability attributed to a constitutionally owned runtime will be required to produce constitutional object types and pass through the RT-03 gate sequence.
- The adoption lifecycle will be the standard on-boarding path for any new subsystem added to the repository.
- The coverage model will provide continuous health monitoring — implementation teams will see subsystem coverage scores in the same way they see test coverage scores.

Long-term: as more subsystems reach Stage 9 (Operational Monitoring), the constitutional architecture moves from being a governance overhead to being the primary source of runtime correctness guarantees. The constitution becomes the system's contract with itself.

### 14.9 W1-09 Next Implementation Task

**W1-09 remains the next implementation task after this strategy document is complete.**

This document is a strategic artifact. It does not change task states, does not authorise new tasks, and does not advance the wave plan. The implementation era continues with W1-09 (RT-11 Civilization Intelligence Runtime Type Definitions) as the next authorised implementation task, following the task authorization and certification process established by W1-02 through W1-08.

---

*Document ID: APEX-CONSTITUTIONAL-ADOPTION-STRATEGY*
*Baseline: APEX-CONSTITUTION-v1.0*
*Date: 2026-07-27*
*Status: ACTIVE*
*Constitutional authority: A0-v1.1.1; I2-IMPLEMENTATION-GOVERNANCE-MODEL.md*
*Amendment: Via IDR — does not require full constitutional amendment unless constitutional authority is affected.*
