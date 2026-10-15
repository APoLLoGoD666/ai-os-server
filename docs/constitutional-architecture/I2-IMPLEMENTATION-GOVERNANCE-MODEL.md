# I2 — IMPLEMENTATION GOVERNANCE MODEL
## APEX Constitutional Architecture — Implementation Authority and Decision Control

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I2-GOVERNANCE |
| Phase | I2 — Implementation Control Plane |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | D8-v1.0 §1–3; C0-CONSTITUTIONAL-FREEZE-DECLARATION.md |
| Authority | This document governs implementation decisions. It does not govern constitutional decisions. Constitutional decisions require RT-16 amendment. |

**Purpose:** Define the authority model that controls the transition from the current APEX repository into the certified APEX-CONSTITUTION-v1.0 architecture. Every implementation decision made after constitutional freeze must be traceable to this governance model.

**Core principle:** The constitution is frozen. Implementation authority exists only within the space the constitution defines. No implementation decision may supersede, reinterpret, or bypass a constitutional constraint. Implementations realize the constitution; they do not direct it.

---

## PART 1 — AUTHORITY HIERARCHY

### 1.1 Constitutional Authority (Immutable)

Constitutional authority is the highest authority in the system. It is exercised exclusively through the constitutional corpus and amended exclusively through RT-16.

| Authority Source | Documents | Immutable? | Amendment Path |
|-----------------|-----------|------------|----------------|
| Foundational principles | D-series (D-2 through D8) | Yes | RT-16 Class I |
| Runtime registry | A0-v1.1.1 | Yes | RT-16 Class I |
| Interaction architecture | A1-v1.2 | Yes | RT-16 Class I |
| Runtime specifications | R1-v1.1 through R16-v1.0 | Yes | RT-16 Class I |
| Constitutional errata | C0-ERRATA-REGISTER.md | Yes (accepted) | RT-16 Class III correction |

**Rule CA-1:** No implementation decision may modify, reinterpret, or override a constitutional authority source. An implementation that conflicts with constitutional authority is non-compliant, not the constitution.

**Rule CA-2:** Where implementation authority appears to conflict with constitutional authority, constitutional authority governs. The implementation must be changed, not the interpretation of the constitution.

**Rule CA-3:** The C0 constitutional freeze is irrevocable through implementation decisions. Post-freeze changes to constitutional behavior require RT-16 amendment through the formal 15-step process.

### 1.2 Implementation Authority (Operational)

Implementation authority governs how the constitutional architecture is realized in the repository. It operates within the constitutional space.

**The Implementation Owner** is the single human who holds final implementation authority. This role:
- Approves all Change Class A and Change Class B decisions (see Part 3)
- Holds rollback authority for all waves
- May authorize emergency remediation
- Signs off on every Gate (Gates 0–6, per I2-IMPLEMENTATION-GATE-SPECIFICATION.md)

**The Implementation Author** is the engineer who produces code changes. This role:
- Executes tasks within approved wave plans
- Must not make Change Class A or B decisions without Implementation Owner approval
- Must escalate when a task conflicts with constitutional authority
- Must produce Implementation Decision Records for any non-trivial decision

### 1.3 Authority Separation Principle

Per D8 INV-3 (Authority Separation), the three authority types in the implementation process are:

| Type | Holder | Scope | May Override? |
|------|--------|-------|---------------|
| Constitutional Authority | The constitutional corpus | What the system must do | Never — frozen |
| Implementation Authority | Implementation Owner | How the system does it | Within constitutional bounds only |
| Execution Authority | Implementation Author | Which code realizes it | Within approved decisions only |

No holder of execution authority may exercise implementation authority without explicit delegation. No holder of implementation authority may exercise constitutional authority.

---

## PART 2 — DECISION TYPE TAXONOMY

All decisions arising during implementation must be classified. The classification determines the approval requirement.

### 2.1 Constitutional Change (CC)

**Definition:** A change to the constitutional corpus — the D-series, A-series, or R-series documents, or the errata register.

**Examples:**
- Adding a new runtime to A0
- Modifying a runtime's owned objects in a runtime specification
- Adding a new constitutional invariant to D8
- Correcting an existing errata item

**Authority required:** RT-16 (Amendment Runtime) full 15-step pipeline.

**Implementation authority may not:** Classify a constitutional change as an implementation change to avoid the RT-16 pipeline.

---

### 2.2 Implementation Change (IC)

**Definition:** A change to how the system realizes a constitutional requirement. The constitutional requirement itself is unchanged; the repository artifact that realizes it is changed.

**Examples:**
- Changing the database schema for RT-05 ChangeRecord (different table structure, same constitutional function)
- Using a different event bus mechanism for Class B notifications
- Refactoring `execution-transaction.js` internal logic without changing its constitutional function
- Choosing `lib/constitutional-types/` over `lib/runtime/types/` as the canonical path for type definitions

**Authority required:** Implementation Owner approval. Implementation Decision Record required (see Part 5).

**Constraint:** Implementation changes may not change the observable constitutional behavior. An IC that alters what a runtime produces, consumes, or enforces is not an IC — it is a potential CC.

---

### 2.3 Migration Decision (MD)

**Definition:** A decision about the disposition of an existing repository artifact during the transition to the constitutional architecture.

**Examples:**
- Classifying `routes/civilisation.js` as DELETE after merge
- Classifying `lib/cognitive/` as MERGE → DELETE (OVL-009)
- Choosing to WRAP `decision-lattice.js` rather than REPLACE it
- Deferring `agent-system/` to Wave 4 rather than Wave 2

**Authority required:** Implementation Owner approval. Migration decision recorded in the artifact's entry in I2-APEX-IMPLEMENTATION-LEDGER.md.

**Constraint:** A migration decision that changes the constitutional function of the migrated artifact is not an MD — it is an IC or CC.

---

### 2.4 Refactor Decision (RD)

**Definition:** An internal code quality improvement that does not change behavior or constitutional function.

**Examples:**
- Extracting a helper function from a large module
- Renaming a local variable
- Adding a code comment
- Reformatting code

**Authority required:** Implementation Author discretion. No record required unless the refactor modifies a constitutionally-preserved artifact (see I1-ARCHITECTURE Part 18).

**Constraint:** No refactor may touch a constitutionally-preserved artifact without being reclassified as an IC.

---

### 2.5 Temporary Compatibility Layer (TCL)

**Definition:** An adapter or shim introduced to allow old and new systems to coexist during the migration period. A TCL is always explicitly temporary — it has a defined removal condition.

**Examples:**
- A wrapper that accepts calls from both old `agent-system/episodic-memory.js` callers and the new constitutional RT-07 interface
- A route alias that maps old API paths to new constitutional namespaces
- A type-coercion function that converts pre-constitutional data structures to constitutional object types

**Authority required:** Implementation Owner approval. The TCL entry must specify its removal condition and the verification evidence required for removal.

**Rule TCL-1:** Every TCL must have a documented removal condition in the Implementation Ledger before deployment.

**Rule TCL-2:** TCLs may not become permanent. An unconditional TCL is a constitutional drift risk.

**Rule TCL-3:** No TCL may conceal a constitutional violation. If the underlying system is non-compliant, the TCL must surface this, not suppress it.

---

## PART 3 — CHANGE CLASSIFICATION SYSTEM

### 3.1 Class Matrix

| Change Class | Definition | Approval | Record |
|-------------|-----------|----------|--------|
| Class A — Constitutional Change | Modifies constitutional corpus | RT-16 pipeline | Amendment record |
| Class B — Implementation Change | Modifies realization of constitutional requirement | Implementation Owner | IDR required |
| Class C — Migration Decision | Dispositions an existing artifact | Implementation Owner | Ledger update |
| Class D — Refactor | Internal quality change; no behavior change | Author discretion | None (unless preserved artifact) |
| Class E — TCL | Temporary compatibility adapter | Implementation Owner | Ledger entry with removal condition |
| Class F — Constitutional Query | Interpreting what the constitution requires | Implementation Owner resolution, constitution governs | Consultation record if ambiguous |

### 3.2 Classification Escalation

If an author is uncertain of a change's class, the rule is: **escalate up**. Misclassifying a Class A as Class D is a constitutional violation. Misclassifying a Class D as Class A is wasteful but safe.

**Escalation rule:** When in doubt, treat the change as one class higher than initial assessment.

### 3.3 Constitutional Query Resolution

A Constitutional Query (Class F) arises when the constitution's requirement is ambiguous in a specific implementation context. Resolution process:

1. The Implementation Author raises the query in writing, citing the specific constitutional text
2. The Implementation Owner reviews the constitutional text and I0–I1 documentation
3. If resolvable from existing documentation: Implementation Owner records the resolution as an IDR
4. If not resolvable without constitutional interpretation: the query is escalated to a potential Class A change (RT-16 clarification amendment)
5. Under no circumstances may the author proceed with an interpretation that conflicts with constitutional text

---

## PART 4 — APPROVAL REQUIREMENTS

### 4.1 Class A (Constitutional Change)

- Full RT-16 15-step pipeline required
- RT-11 deliberation required before RT-16 can receive the proposal
- RT-04 PreservationAuditRecord required for Class I amendments
- Human actor authorization required for Class I amendments (D7 §12.2)
- All 6 RT-03 gates required for amendment commit
- No implementation author may shortcut this process

### 4.2 Class B (Implementation Change)

- Written IDR produced by author
- IDR reviewed and signed by Implementation Owner
- IDR must cite the constitutional basis for the original requirement
- IDR must confirm the change does not alter observable constitutional behavior
- IDR filed in `docs/constitutional-architecture/decisions/` before the change is committed

### 4.3 Class C (Migration Decision)

- Ledger entry updated with new artifact state
- Implementation Owner approves the artifact transition
- For REMOVE state: Implementation Owner confirms all dependencies migrated (see Migration Control System)
- For ADAPTER CREATED state: TCL removal condition documented

### 4.4 Class D (Refactor Decision)

- Author discretion
- Exception: if the refactored file appears in I1-ARCHITECTURE Part 18 (Constitutional Preservation Requirements), author must reclassify as Class B

### 4.5 Class E (TCL)

- Implementation Owner approval
- TCL removal condition specified in writing before deployment
- Ledger entry created

---

## PART 5 — IMPLEMENTATION DECISION RECORDS

### 5.1 IDR Purpose

An Implementation Decision Record (IDR) documents why an implementation choice was made. IDRs are not constitutional amendments — they record implementation interpretations that remain within constitutional authority.

### 5.2 IDR Schema

```
IDR-[sequence number]
Date: YYYY-MM-DD
Author: [name]
Approved by: [Implementation Owner]
Change Class: [B / C / E]

Decision:
[One sentence stating what was decided]

Constitutional Basis:
[Citation to the constitutional requirement this decision realizes]

Options Considered:
1. [Option A] — [why not chosen]
2. [Option B] — [why not chosen]
3. [Chosen option] — [why chosen]

Constitutional Compliance Confirmation:
[Explicit statement that this decision does not alter observable constitutional behavior]
[If a TCL: removal condition stated here]

Affected Artifacts:
[File paths affected by this decision]

Supersedes:
[IDR number superseded, if any]
```

### 5.3 First Required IDR

The path conflict between I0-IMPLEMENTATION-ROADMAP.md (`lib/runtime/types/`) and I1-IMPLEMENTATION-ARCHITECTURE.md (`lib/constitutional-types/`) must be resolved as the first IDR before Wave 1 begins.

**IDR-001 (required):**
- Decision: Choose one canonical path for constitutional object type definitions
- Constitutional basis: D8 §4.2 (constitutional object types must be accessible)
- I0 ROADMAP states: `lib/runtime/types/`
- I1 ARCHITECTURE states: `lib/constitutional-types/`
- Implementation Owner must approve one path; all subsequent wave tasks use that path

---

## PART 6 — ROLLBACK AUTHORITY

### 6.1 Wave-Level Rollback

Each implementation wave has a defined rollback condition. Rollback authority rests with the Implementation Owner.

**Rollback trigger conditions:**
- A committed wave produces a constitutional violation (PROH-1 through PROH-9)
- A committed wave breaks a constitutionally-preserved artifact (I1-ARCHITECTURE Part 18) without remediation
- Gate verification fails after wave completion
- Production functionality is broken in a way that cannot be fixed with a forward patch in < 4 hours

**Rollback authority:** Implementation Owner, unilaterally. No approval required. Rollback is a safety action.

### 6.2 Task-Level Rollback

Each task in a wave has a documented rollback plan (see I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md). The Implementation Author executes the rollback plan if the task fails verification. No Implementation Owner approval required for task-level rollback.

### 6.3 Rollback Constraints

**Rule RB-1:** Rolling back a wave must not delete data from append-only tables. Rollback operates at the code level; the migration data remains.

**Rule RB-2:** Rolling back a wave must not re-introduce a REMOVE-state artifact that has been constitutionally retired.

**Rule RB-3:** Rollback does not affect the migration state of artifacts that were independently verified before the failed change.

### 6.4 Emergency Rollback

If production is broken and the author cannot reach the Implementation Owner: the author has authority to execute the documented rollback plan for the current task. The Implementation Owner must be notified immediately after rollback execution.

---

## PART 7 — EMERGENCY REMEDIATION PROCESS

### 7.1 Emergency Triggers

An emergency is declared when:
1. A constitutional violation is discovered in production code that was not caught by the wave gate
2. A previously-verified system fails a constitutional invariant check in production
3. Data corruption is discovered in an append-only table
4. A constitutional gate is failing open (bypassing a D-4 §3.3 required gate)

### 7.2 Emergency Response Protocol

**Step 1 — Declare:** Implementation Owner declares an emergency and records the constitutional basis for the emergency classification.

**Step 2 — Contain:** If the emergency involves a constitutional gate failure, immediately verify the PETL state machine is operational. If the gate is failing open, the emergency requires immediate attention — no operations may proceed through the failing gate until it is restored.

**Step 3 — Assess:** Determine whether the fix is a Class D (refactor — restore to previous behavior) or Class B (implementation change — new behavior needed to fix the violation).

**Step 4 — Execute:** Class D fixes may be applied immediately. Class B fixes require Implementation Owner approval even under emergency.

**Step 5 — Record:** After the emergency is resolved, an IDR must be filed within 24 hours documenting the nature of the violation, the fix applied, and the constitutional basis.

**Step 6 — Post-mortem:** Within 1 week of an emergency involving a constitutional gate failure, a post-mortem document must be produced and filed.

### 7.3 What Cannot Be Done Under Emergency Authorization

Even under emergency:
- A constitutional change (Class A) may not bypass RT-16
- Append-only table records may not be deleted
- A gate may not be disabled to allow operations through — the gate must be fixed first
- A REMOVE-state artifact may not be re-introduced

---

## PART 8 — GOVERNANCE MONITORING

### 8.1 Wave Progress Tracking

The Implementation Ledger (I2-APEX-IMPLEMENTATION-LEDGER.md) is the single source of truth for implementation progress. It must be updated:
- After each completed task (implementation state updated)
- After each gate passage (gate state updated)
- After each migration decision (artifact state updated)
- After each IDR approval (IDR filed)

**Rule MON-1:** No artifact may advance from MIGRATED to VERIFIED without a gate passage recorded in the Ledger.

**Rule MON-2:** The Ledger is an authoritative record. Discrepancies between the Ledger and actual repository state constitute a governance failure.

### 8.2 Constitutional Drift Detection

Constitutional drift occurs when implementation decisions, accumulated over time, produce behavior that deviates from constitutional specification without a formal amendment. Drift is distinct from a single violation — it is incremental.

**Drift detection obligations:**
- At each Gate passage, the Implementation Owner must review all IDRs since the last gate for drift signals
- Any IDR that "reasonably interprets" a constitutional requirement must be reviewed — reasonable interpretation is a drift risk
- If the accumulated implementation deviates materially from the constitutional spec, this must be treated as a potential Class A situation requiring RT-16 clarification

### 8.3 Governance Record Retention

All governance records (IDRs, gate verdicts, emergency post-mortems, migration decisions) are retained indefinitely. They form the implementation provenance chain required by D8 INV-2 (Provenance Preservation).

---

*End of I2-IMPLEMENTATION-GOVERNANCE-MODEL.md*
*Document ID: I2-GOVERNANCE | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
