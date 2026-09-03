# I2 — FIRST IMPLEMENTATION WAVE PLAN
## APEX Constitutional Architecture — Executable Engineering Waves 0–3

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I2-FIRST-WAVE |
| Phase | I2 — Implementation Control Plane |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | D8-v1.0; C0-CONSTITUTIONAL-FREEZE-DECLARATION.md |
| Source Sequencing | I1-IMPLEMENTATION-SEQUENCING.md |
| Authority | I2-IMPLEMENTATION-GOVERNANCE-MODEL.md |

**Purpose:** Convert the I1 sequencing plan into the first executable engineering waves with full operational metadata for each task. This document is the bridge between the planning phase (I0–I2) and actual code execution. No code may be written before Gate 0 is formally passed.

**How to use this document:**
1. Gate 0 must be passed (per I2-IMPLEMENTATION-GATE-SPECIFICATION.md) before any task in Wave 0 may begin
2. Execute tasks within each wave in the order listed
3. Do not begin a task until all listed dependencies are satisfied
4. At the end of each wave, execute the wave gate procedure
5. Do not begin the next wave until the gate verdict is PASS
6. Any deviation from an approved task scope requires an IDR (see I2-IMPLEMENTATION-GOVERNANCE-MODEL.md Part 5)

**Pre-execution prerequisite:** IDR-001 must be resolved (canonical path for constitutional object types: `lib/constitutional-types/` vs `lib/runtime/types/`). The Implementation Owner must file IDR-001 and approve one path before Gate 0 can be passed.

---

## WAVE SUMMARY

| Wave | Name | Tasks | Gate | Key Deliverable |
|------|------|-------|------|----------------|
| Wave 0 | Preparation | 2 (PWA-01, PWA-02) | Gate 1 | Route collision resolved; boundary declared |
| Wave 1 | Constitutional Object Layer | 16 (W1-01 – W1-16) | Gate 2 | All 35 constitutional object types loadable |
| Wave 2 | Constitutional Wiring | 12 (W2-01 – W2-12) | Gate 3 | PETL Step 2 wired; Gate 6 operational; ChangeRecord production live |
| Wave 3 | Missing Runtimes | 6 (W3-01 – W3-06) | Gate 4 | RT-16 pipeline; full Constitutional Loop end-to-end |

**Do not execute Wave 4 or Wave 5 under this wave plan.** Those waves are covered in I2-APEX-IMPLEMENTATION-LEDGER.md and require Gate 4 passage first.

---

## PART 1 — WAVE 0: PREPARATION

**Purpose:** Resolve blocking structural issues that would contaminate all subsequent work. Wave 0 tasks are not implementation — they are declarations and surgical fixes.

**Wave 0 entry condition:** Gate 0 PASS (per I2-IMPLEMENTATION-GATE-SPECIFICATION.md).

**Wave 0 exit condition:** Gate 1 PASS. `routes/civilisation.js` deleted. Boundary declaration document exists.

**Critical path note:** PWA-02 (route collision) is the single highest-priority task. It blocks Wave 1 entirely. PWA-01 (boundary declaration) is non-blocking but must complete before Wave 1 begins.

---

### PWA-01 — Agent-System / Lib Boundary Declaration

| Field | Value |
|-------|-------|
| Task ID | PWA-01 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D (documentation artifact — author discretion) |
| Wave | 0 |

**Objective:** Produce the boundary declaration document that specifies the interface between `agent-system/` (pre-constitutional execution environment) and `lib/` (constitutional implementation layer). This prevents later ambiguity about which agent operations require PETL routing.

**Runtime Affected:** None (preparatory documentation).

**Files Affected:**
- CREATE: `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md`

**Dependencies:** None. This task may begin immediately after Gate 0 PASS.

**Constitutional Basis:** I1-ARCHITECTURE Part 4 §4.3 (Wave 4 deferral for `agent-system/`); I2-MIGRATION-CONTROL-SYSTEM.md RT-N migration tracking entry for deferred artifacts.

**Task Steps:**
1. Create `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md`
2. Document: the two execution environments — `agent-system/` (pre-constitutional) and `lib/` (constitutional)
3. Document: which agent-system operations are Class A (must route through PETL) vs. Class B (may call `lib/` directly)
4. Document: which `lib/` modules `agent-system/` is permitted to call during Wave 0–3 (before formal migration)
5. Document: the Wave 4 deferral decision and its constitutional justification

**Expected Output:**
- `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md`

**Validation Method:**
- Document exists at the specified path
- Document is reviewed by Implementation Owner before Wave 1 begins
- Both execution environments are named and described
- Class A vs. Class B classification for agent operations is specified

**Rollback Plan:**
- N/A — documentation-only artifact. Delete the file if Wave 0 fails for another reason. No code changes to reverse.

**Ledger Update:** Mark PWA-01 MIGRATED in I2-APEX-IMPLEMENTATION-LEDGER.md after completion.

---

### PWA-02 — Route Collision Resolution (OVL-001)

| Field | Value |
|-------|-------|
| Task ID | PWA-02 |
| Complexity | M |
| Risk | HIGH |
| Change Class | Class C (Migration Decision: `routes/civilisation.js` → REMOVE) |
| Wave | 0 |
| OVL Reference | OVL-001 (CRITICAL — from I0-LEGACY-AND-OVERLAP-REGISTER.md) |

**Objective:** Eliminate the `routes/civilisation.js` vs `routes/civilization.js` duplicate-and-conflict pair. `routes/civilization.js` (22.0KB) is canonical. `routes/civilisation.js` (6.8KB) must be audited, any unique endpoints migrated, and then deleted. This task blocks all of Wave 1.

**Runtime Affected:** None directly. Removes structural obstacle to Wave 1 type introduction.

**Files Affected:**
- AUDIT: `routes/civilisation.js` (all endpoints catalogued)
- MODIFY: `routes/civilization.js` (receive any unique endpoints from civilisation.js)
- MODIFY: `server.js` (verify single mount for civilization routes)
- DELETE: `routes/civilisation.js`

**Dependencies:** None. This task is the blocking root of the entire critical path.

**Constitutional Basis:** I1-REPOSITORY-MIGRATION-PLAN.md §4.1 (OVL-001 classification: MERGE→DELETE); I2-MIGRATION-CONTROL-SYSTEM.md Rule MP-3 (explicit disposition required before removal).

**Task Steps:**
1. Read `routes/civilisation.js` in full — catalogue every route handler (GET, POST, etc.) and its endpoint path
2. Compare against `routes/civilization.js` — identify any endpoints in civilisation.js that are NOT present in civilization.js
3. For each unique endpoint in civilisation.js:
   a. Copy the handler to `routes/civilization.js`
   b. Ensure the route path uses the internal sub-prefix `/civilization/` (per CLAUDE.md rule for routes/civilization.js)
4. Open `server.js` — verify that only `routes/civilization.js` is mounted. Remove any mount for `routes/civilisation.js` if present.
5. Run `node --check server.js` to confirm syntax validity
6. Delete `routes/civilisation.js`
7. Run `node --check server.js` again to confirm deletion did not break syntax
8. Test: each previously-working civilization endpoint should respond correctly

**Expected Output:**
- `routes/civilisation.js` does not exist
- `routes/civilization.js` contains all previously-unique endpoints from both files
- `server.js` has a single mount for civilization routes
- `node --check server.js` passes

**Validation Method:**
1. `ls routes/civil*` returns only `civilization.js` — not `civilisation.js`
2. `node --check server.js` exits 0
3. `node -e "require('./routes/civilization')"` exits 0
4. Manual endpoint test: send requests to any civilization routes that existed only in civilisation.js and verify they respond

**Risk Notes:**
- Risk: endpoints in civilisation.js may have different internal logic from identically-named endpoints in civilization.js. If a route path exists in both files with different implementations, the Implementation Author must escalate to the Implementation Owner for a Class C migration decision before merging.
- Risk: server.js may mount civilization routes under a different prefix than expected. Verify mount path before deleting civilisation.js.
- HIGH risk rating: this modifies a production route file. Execute in a deployment window if possible.

**Rollback Plan:**
1. Restore `routes/civilisation.js` from git: `git checkout HEAD -- routes/civilisation.js`
2. Restore `server.js` to pre-task state: `git checkout HEAD -- server.js`
3. Run `node --check server.js` to confirm restoration
4. Notify Implementation Owner of rollback

**Ledger Update:** Mark OVL-001 as RESOLVED in I2-APEX-IMPLEMENTATION-LEDGER.md. Mark `routes/civilisation.js` state as REMOVED.

---

### WAVE 0 EXIT GATE (Gate 1)

Execute Gate 1 verification per I2-IMPLEMENTATION-GATE-SPECIFICATION.md before beginning Wave 1.

**Minimum requirements to pass:**
- [ ] `routes/civilisation.js` does not exist in repository
- [ ] `routes/civilization.js` is the single canonical civilization route
- [ ] `node --check server.js` passes
- [ ] `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md` exists
- [ ] Boundary document reviewed by Implementation Owner
- [ ] IDR-001 filed and approved (canonical type path decided)
- [ ] I2-APEX-IMPLEMENTATION-LEDGER.md updated with Wave 0 task states

**Gate 1 failure action:** Do not begin Wave 1. Diagnose and remediate the failing check. Record gate failure in the Ledger.

---

## PART 2 — WAVE 1: CONSTITUTIONAL OBJECT LAYER

**Purpose:** Create all 35 constitutional object type schemas in `lib/constitutional-types/`. No behavior is wired in Wave 1. Types are additive-only — they do not break any existing code.

**Wave 1 entry condition:** Gate 1 PASS.

**Wave 1 exit condition:** Gate 2 PASS. `require('lib/constitutional-types/index.js')` loads all 35+ types without error.

**Wave 1 principle:** Types are introduced in dependency order. A type file that references another type must be created after that type exists. All tasks in Wave 1 are LOW risk — they are additive and do not touch any production execution path.

**Path used:** The canonical path resolved in IDR-001. All task steps below use `lib/constitutional-types/` as the canonical directory (subject to IDR-001 resolution).

---

### WAVE 1 EXECUTION STATUS — updated 2026-07-25

> Live authorization state for all Wave 1 tasks. An implementer must verify this table before beginning any task. A task marked BLOCKED must not begin regardless of whether its listed code dependencies appear satisfied.

| Task | Status | Authorization | Blocking Condition |
|------|--------|---------------|--------------------|
| W1-01 | COMPLETE | — | — |
| W1-02 | COMPLETE | — | — |
| W1-02A | COMPLETE | — | — |
| W1-03 | **COMPLETE** | CERTIFIED | — |
| W1-04 | **COMPLETE** | CERTIFIED | — |
| W1-05 | **COMPLETE** | CERTIFIED | — |
| W1-06 | **COMPLETE** | CERTIFIED | — |
| W1-07 | **COMPLETE** | CERTIFIED | — |
| W1-08 | COMPLETE | **CERTIFIED** 2026-07-26 | 3 types; C-1/C-2/C-3 discrepancies documented |
| W1-09 | COMPLETE | **CERTIFIED** 2026-07-27 | 7 types; D-1/D-2 discrepancies documented |
| W1-10 | **COMPLETE** | **CERTIFIED** 2026-07-27 | 5 types; D-1/D-2/D-3 discrepancies documented |
| W1-11 | **COMPLETE** | **CERTIFIED** 2026-07-27 | 9 types; D-1/D-2/D-3/D-4 discrepancies documented |
| W1-12 | **COMPLETE** | CERTIFIED | — |
| W1-13 | **COMPLETE** | CERTIFIED | — |
| W1-14 | **COMPLETE** | CERTIFIED | — |
| W1-15 | **COMPLETE** | **CERTIFIED** 2026-07-27 | 4 types; D-1 discrepancy documented |
| W1-16 | **COMPLETE** | **CERTIFIED** 2026-07-27 | 83 types; 16 runtimes; Gate 2 criteria satisfied; record: `docs/implementation/WAVE-1-CONSTITUTIONAL-COMPLETION-CERTIFICATION.md` |

**Tasks that can begin immediately (parallel):** W1-03, W1-04, W1-05, W1-12, W1-13, W1-14.

**Critical path:** W1-06 → W1-07 → W1-08 → W1-09 → W1-10/W1-15 → W1-11 → W1-16. (W1-16 COMPLETE CERTIFIED 2026-07-27. Wave 1 CLOSED. Gate 2 criteria satisfied. Wave 2 pending Implementation Owner Gate 2 PASS declaration.)

---

### W1-01 — Constitutional Types Registry (Stub)

| Field | Value |
|-------|-------|
| Task ID | W1-01 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D (new files, no behavior change) |
| Wave | 1 |

**Objective:** Create the `lib/constitutional-types/` directory and `index.js` stub registry. This is the container that all subsequent W1 tasks populate.

**Runtime Affected:** None (registry infrastructure only).

**Files Affected:**
- CREATE: `lib/constitutional-types/` (directory)
- CREATE: `lib/constitutional-types/index.js` (stub with placeholder comments for all 35 types)

**Dependencies:** PWA-01, PWA-02, Gate 1 PASS, IDR-001 approved.

**Task Steps:**
1. Create directory `lib/constitutional-types/`
2. Create `lib/constitutional-types/index.js` as a stub module that lists all 35 type names as comments
3. The stub exports an empty object: `module.exports = {};` — will be populated by W1-02 through W1-16
4. Run `node --check lib/constitutional-types/index.js`

**Expected Output:**
- `lib/constitutional-types/index.js` (stub)

**Validation Method:**
- `node --check lib/constitutional-types/index.js` exits 0
- Directory exists

**Rollback Plan:**
- Delete `lib/constitutional-types/` entirely. No production code references it yet.

---

### W1-02 — RT-01 Identity Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-02 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.1; R1-v1.1 |

**Objective:** Define the 7 RT-01 constitutional object type schemas.

**Runtime Affected:** RT-01 (Identity Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/identity-record.js`
- MODIFY: `lib/constitutional-types/index.js` (add 7 type registrations)

**Dependencies:** W1-01.

**Types to create:**
`ActorProfile`, `ExternalReference`, `StructuralIdentityRecord`, `SemanticIdentityRecord`, `ReferentialIdentityRecord`, `IdentityConflictRecord`, `IdentityEndRecord`

**Task Steps:**
1. Create `lib/constitutional-types/identity-record.js` exporting all 7 type schema constructors/validators
2. Each type must have the fields specified in I1-IMPLEMENTATION-SEQUENCING.md §W1-02
3. Add to `index.js`: `const identity = require('./identity-record'); module.exports = { ...module.exports, ...identity };`
4. Run `node --check lib/constitutional-types/identity-record.js`

**Validation Method:**
- `node --check lib/constitutional-types/identity-record.js` exits 0
- `node -e "const t = require('./lib/constitutional-types/identity-record'); console.log(Object.keys(t))"` lists all 7 type names

**Rollback Plan:**
- Delete `lib/constitutional-types/identity-record.js`
- Revert `index.js` to remove the registration lines

---

### W1-03 — RT-02 Authority Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-03 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.2; D6 §4.2–4.7 |

**Objective:** Define the 5 RT-02 constitutional object type schemas.

**Runtime Affected:** RT-02 (Authority Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/authority-certificate.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-02.

**Types to create:**
`DelegationRecord`, `AuthorityClaim`, `AuthorityRevocationRecord`, `AuthorityConflictRecord`, `AuthorityScope`

**Task Steps:**
1. Create `lib/constitutional-types/authority-certificate.js` with 5 type schemas
2. Register in `index.js`
3. Run `node --check lib/constitutional-types/authority-certificate.js`

**Validation Method:**
- `node --check` exits 0
- All 5 type names loadable from the module

**Rollback Plan:**
- Delete `authority-certificate.js`; revert `index.js` registration lines

---

### W1-04 — RT-05 Reality Fabric Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-04 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.5; D-3 |

**Objective:** Define the 4 RT-05 constitutional object type schemas. These types are on the critical path for W2-03 (ChangeRecord production) and W2-04 (Gate 6).

**Runtime Affected:** RT-05 (Reality Fabric Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/change-record.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-01 (may run in parallel with W1-02 and W1-03 since it has no dependency on them).

**Types to create:**
`ChangeRecord`, `HistoricalAnchor`, `FabricFoundingRoot`, `ObjectLifecycleRecord`

**Task Steps:**
1. Create `lib/constitutional-types/change-record.js` with 4 type schemas
2. `ChangeRecord` must include: `change_id`, `claim_ref`, `stage_from`, `stage_to`, `transition_vector`, `timestamp`, `actor_ref`, `historical_anchor_ref`
3. `HistoricalAnchor` must include: `anchor_id`, `claim_ref`, `latest_change_id`, `first_seen_at`, `last_modified_at`
4. Register in `index.js`
5. Run `node --check lib/constitutional-types/change-record.js`

**Validation Method:**
- `node --check` exits 0
- `ChangeRecord` and `HistoricalAnchor` both exported

**Rollback Plan:**
- Delete `change-record.js`; revert `index.js`

---

### W1-05 — RT-07 Memory Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-05 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.8 (canonical per C0-MANIFEST §5.2 item 2); RT07-v1.0 |

**Objective:** Define the 4 RT-07 constitutional object type schemas. `HistoricalStateQueryResult` is critical — it is the RT-07→RT-03 interface object required for W2-01 and W2-02.

**Runtime Affected:** RT-07 (Memory Runtime — canonical name per C0-MANIFEST §5.2 item 2).

**Files Affected:**
- CREATE: `lib/constitutional-types/historical-state-record.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-01 (may run in parallel with W1-02, W1-03, W1-04).

**Types to create:**
`HistoricalStateRecord`, `ProvenanceChain`, `MemoryLifecycleRecord`, `HistoricalStateQueryResult`

**Task Steps:**
1. Create `lib/constitutional-types/historical-state-record.js` with 4 type schemas
2. `HistoricalStateQueryResult` must include: `query_id` (UUID), `query_timestamp`, `historical_layers`, `temporal_validity_ms`, `status` (one of `'VALID' | 'PARTIAL' | 'UNAVAILABLE'`)
3. Register in `index.js`
4. Run `node --check lib/constitutional-types/historical-state-record.js`

**Validation Method:**
- `node --check` exits 0
- `HistoricalStateQueryResult` exported with `status` enum enforced

**Rollback Plan:**
- Delete `historical-state-record.js`; revert `index.js`

---

### W1-06 — RT-08 Observation Type Definitions

> ✅ **COMPLETE — 2026-07-26**
>
> IDR-003 RESOLVED (Option A: RT-08 owns `ConsequenceObservationRecord`). W1-06 implemented as specified.
> `lib/constitutional-types/observation-record.js` CREATED — 5 types, 47 registry total.
> All 10 validations PASS. Certification record: `docs/constitutional-architecture/implementation/W1-06-OBSERVATION-TYPE-RECORD.md`

| Field | Value |
|-------|-------|
| Task ID | W1-06 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.9; R8-v1.1-canonical.md RS-07/RS-10; D5 PI-1–PI-12; IDR-003 RESOLVED Option A |
| **Status** | **COMPLETE** |

**Objective:** Define the 5 RT-08 constitutional object type schemas.

**Runtime Affected:** RT-08 (Observation Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/observation-record.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-01 (may run in parallel with other W1 tasks that have no mutual dependency).

**Types to create:**
`ObservationRecord`, `ObserverRegister`, `ObservationChannelRecord`, `ConsequenceObservationRecord`, `ObserverLimitationRecord`

**Task Steps:**
1. Create `lib/constitutional-types/observation-record.js` with 5 type schemas
2. `ObservationRecord` must include `lineage_ref` — this is required for INV-4 (KnowledgeRecord traceability to ObservationRecord)
3. Register in `index.js`
4. Run `node --check lib/constitutional-types/observation-record.js`

**Validation Method:**
- `node --check` exits 0
- `ObservationRecord.lineage_ref` field present in schema

**Rollback Plan:**
- Delete `observation-record.js`; revert `index.js`

---

### W1-07 — RT-09 Knowledge Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-07 |
| Complexity | M |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.9 |

**Objective:** Define the 8 RT-09 constitutional object type schemas.

**Runtime Affected:** RT-09 (Knowledge Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/knowledge-record.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-06 (EvidenceObject derives from ObservationRecord).

**Types to create:**
`EvidenceObject`, `InterpretationRecord`, `BeliefObject`, `KnowledgeClaim`, `KnowledgeState`, `ContradictionRecord`, `RealityGapEntry`, `EpistemicProtocol`

**Task Steps:**
1. Create `lib/constitutional-types/knowledge-record.js` with 8 type schemas
2. `EvidenceObject` must include `observation_ref` — required for INV-4 lineage chain
3. `KnowledgeState.dks_level` must be one of `'UNKNOWN' | 'PARTIAL' | 'BELIEVED' | 'CONFIRMED'`
4. Register in `index.js`
5. Run `node --check lib/constitutional-types/knowledge-record.js`

**Validation Method:**
- `node --check` exits 0
- All 8 type names loadable
- `KnowledgeState.dks_level` enum documented in schema

**Rollback Plan:**
- Delete `knowledge-record.js`; revert `index.js`

---

### W1-08 — RT-10 Understanding Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-08 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.10 |

**Objective:** Define the 3 RT-10 constitutional object type schemas.

**Runtime Affected:** RT-10 (Intelligence Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/cum.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-07.

**Types to create:**
`DomainUnderstandingModel`, `InferenceProtocol`, `UnderstandingDegradationFlag`

**Task Steps:**
1. Create `lib/constitutional-types/cum.js` with 3 type schemas
2. Register in `index.js`
3. Run `node --check lib/constitutional-types/cum.js`

**Validation Method:**
- `node --check` exits 0
- All 3 types exported

**Rollback Plan:**
- Delete `cum.js`; revert `index.js`

---

### W1-09 — RT-11 Civilization Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-09 |
| Complexity | M |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.11; C0-ERRATA-011A |

**Objective:** Define the 7 RT-11 constitutional object type schemas. Note C0-ERRATA-011A: RT-11 state variable must use `CivilizationalDecisionProposal` not `CivilizationalDecision` — `CivilizationalDecision` is RT-12 owned.

**Runtime Affected:** RT-11 (Civilization Intelligence Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/civilizational-decision-proposal.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-08.

**Types to create:**
`CivilizationUnderstandingModel` (CUM), `DeliberationRecord`, `CausalModel`, `AssumptionRegister`, `StrategicPlan`, `CivilizationCoherenceState`, `CivilizationalDecisionProposal`

**Task Steps:**
1. Create `lib/constitutional-types/civilizational-decision-proposal.js` with 7 type schemas
2. `CivilizationalDecisionProposal.submitted_to_rt12_at` field must be present — this is how RT-11 hands off to RT-12
3. Confirm: `CivilizationalDecision` is NOT defined here — it belongs to RT-12 (W1-10)
4. Register in `index.js`
5. Run `node --check lib/constitutional-types/civilizational-decision-proposal.js`

**Validation Method:**
- `node --check` exits 0
- 7 types exported; `CivilizationalDecision` is NOT in this file
- `CivilizationalDecisionProposal.submitted_to_rt12_at` field present in schema

**Rollback Plan:**
- Delete `civilizational-decision-proposal.js`; revert `index.js`

---

### W1-10 — RT-12 Decision Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-10 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.12; RT12-v1.0; C0-MANIFEST §5.2 items 3 and 4 |

**Objective:** Define the 5 RT-12 constitutional object type schemas. RT-12 canonical name is "Decision Runtime" (C0-MANIFEST §5.2 item 3). RT-12 owns `CivilizationalDecision` — not RT-11 (C0-MANIFEST §5.2 item 4).

**Runtime Affected:** RT-12 (Decision Runtime — canonical per C0-MANIFEST §5.2 item 3).

**Files Affected:**
- CREATE: `lib/constitutional-types/civilizational-decision.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-09.

**Types to create:**
`CivilizationalDecision`, `OpenActionRegisterEntry`, `DecisionArchiveRecord`, `CivilizationalDecisionChainRecord`, `ComplianceVerificationRecord`

**Task Steps:**
1. Create `lib/constitutional-types/civilizational-decision.js` with 5 type schemas
2. `ComplianceVerificationRecord.verdict` must be one of `'COMPLIANT' | 'NON_COMPLIANT'`
3. `CivilizationalDecision` must include `proposal_ref` — linking back to RT-11's `CivilizationalDecisionProposal`
4. Register in `index.js`
5. Run `node --check lib/constitutional-types/civilizational-decision.js`

**Validation Method:**
- `node --check` exits 0
- `ComplianceVerificationRecord.verdict` enum documented
- `CivilizationalDecision.proposal_ref` field present

**Rollback Plan:**
- Delete `civilizational-decision.js`; revert `index.js`

---

### W1-11 — RT-13/RT-14 Action and Consequence Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-11 |
| Complexity | M |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.13–3.14; D5 |

**Objective:** Define 5 RT-13 and 4 RT-14 constitutional object type schemas across two files.

**Runtime Affected:** RT-13 (Action Runtime), RT-14 (Reflection Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/effect-expectation-record.js` (RT-13 types)
- CREATE: `lib/constitutional-types/consequence-observation-record.js` (RT-14 types)
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-10.

**RT-13 types to create:**
`ActionProjection`, `EffectExpectationRecord`, `IrreversibilityClassificationRecord`, `ProjectionResponsibilityRecord`, `ProjectionBoundaryCrossingRecord`

**RT-14 types to create:**
`ObservedConsequenceRecord`, `CausalModelDivergenceRecord`, `OpenActionRegisterTerminalStatusRecord`, `ReflectionTriggerRecord`

**Task Steps:**
1. Create `lib/constitutional-types/effect-expectation-record.js` with 5 RT-13 type schemas
2. `EffectExpectationRecord` must be producible at COMMITTED state — before EXECUTING (INV-7 enforcement)
3. Create `lib/constitutional-types/consequence-observation-record.js` with 4 RT-14 type schemas
4. Register both files in `index.js`
5. Run `node --check` on both files

**Validation Method:**
- `node --check` exits 0 on both files
- 9 total types across both files

**Rollback Plan:**
- Delete both new files; revert `index.js`

---

### W1-12 — RT-06 Coherence Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-12 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.6; R6-v1.1.1 |

**Objective:** Define the 5 RT-06 constitutional object type schemas.

**Runtime Affected:** RT-06 (Coherence Runtime — canonical name per C0-MANIFEST §5.2 item 1).

**Files Affected:**
- CREATE: `lib/constitutional-types/coherence-violation-record.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-01 (may run in parallel with W1-02 through W1-11 since RT-06 has no upstream type dependency within this set).

**Types to create:**
`CoherenceViolationRecord`, `CoherenceResolutionEvent`, `CoherenceConflictRecord`, `CUMDegradationRecord`, `DomainCoherenceStatus`

**Task Steps:**
1. Create `lib/constitutional-types/coherence-violation-record.js` with 5 type schemas
2. `CoherenceViolationRecord.gcr_check_id` must be constrained to integers 1–7 (matching GCR-1 through GCR-7)
3. Register in `index.js`
4. Run `node --check lib/constitutional-types/coherence-violation-record.js`

**Validation Method:**
- `node --check` exits 0
- `gcr_check_id` constraint documented in schema

**Rollback Plan:**
- Delete `coherence-violation-record.js`; revert `index.js`

---

### W1-13 — RT-03/RT-04 Kernel and Audit Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-13 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.3–3.4; D-4; D6 AIR-5 (RT-04 independence) |

**Objective:** Define 5 RT-03 and 5 RT-04 constitutional object type schemas. Note: RT-04 is never gated by RT-03 (D6 §3.4 AIR-5 Audit Independence); the type definitions must not encode any such dependency.

**Runtime Affected:** RT-03 (Constitutional Kernel Runtime), RT-04 (Constitutional Audit Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/kernel-record.js` (RT-03 types)
- CREATE: `lib/constitutional-types/audit-record.js` (RT-04 types)
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-01.

**RT-03 types to create:**
`RejectionRecord`, `AccountabilityRecord`, `RollbackProvenanceRecord`, `SuspensionNotice`, `KernelOperationManifest`

**RT-04 types to create:**
`ConstitutionalAuditRecord`, `ConstitutionalComplianceAttestation`, `ConstitutionalViolationRecord`, `AuditScope`, `PreservationAuditRecord`

**Task Steps:**
1. Create `lib/constitutional-types/kernel-record.js` with 5 RT-03 type schemas
2. `ConstitutionalViolationRecord.violation_code` must be constrained to `'PROH-1' | 'PROH-2' | ... | 'PROH-9'`
3. Create `lib/constitutional-types/audit-record.js` with 5 RT-04 type schemas
4. `PreservationAuditRecord` must include `amendment_ref`, `preserved_elements`, `verified_at`, `verdict` — required for RT-16 Class I amendments
5. Register both files in `index.js`
6. Run `node --check` on both files

**Validation Method:**
- `node --check` exits 0 on both files
- `ConstitutionalViolationRecord.violation_code` PROH-N enum documented
- `PreservationAuditRecord` exported with all required fields

**Rollback Plan:**
- Delete both new files; revert `index.js`

---

### W1-14 — RT-15 Domain Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-14 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.15 |

**Objective:** Define the 7 RT-15 constitutional object type schemas (per-instance types, shared across all 12 domain instances).

**Runtime Affected:** RT-15 (Domain Runtime — 12 instances).

**Files Affected:**
- CREATE: `lib/constitutional-types/domain-profile.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-01.

**Types to create:**
`DomainProfile`, `DomainAuthorityRecord`, `DomainActorProfileRegistry`, `DomainKnowledgeChain`, `DomainCoherenceAssessment`, `DomainFailureModeRecord`, `CrossDomainRelationshipRecord`

**Task Steps:**
1. Create `lib/constitutional-types/domain-profile.js` with 7 type schemas
2. Register in `index.js`
3. Run `node --check lib/constitutional-types/domain-profile.js`

**Validation Method:**
- `node --check` exits 0
- All 7 types exported

**Rollback Plan:**
- Delete `domain-profile.js`; revert `index.js`

---

### W1-15 — RT-16 Amendment Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-15 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |
| Constitutional Basis | A0-v1.1.1 §3.16; R16-v1.0; A1-v1.2 §12.8; C0-ERRATA-016A |

**Objective:** Define the 4 RT-16 constitutional object type schemas. Resolves GAP-16-002. Note C0-ERRATA-016A: the amendment pipeline derives from D7 Part 12, not RS-13/RS-16 — this applies to the behavioral implementation in Wave 3, but the type definitions here must be consistent with D7 Part 12 field requirements.

**Runtime Affected:** RT-16 (Amendment Runtime).

**Files Affected:**
- CREATE: `lib/constitutional-types/amendment-proposal.js`
- MODIFY: `lib/constitutional-types/index.js`

**Dependencies:** W1-09 (AmendmentProposal includes `proposer_deliberation_ref` linking to RT-11 deliberation).

**Types to create:**
`AmendmentProposal`, `AmendmentRegistry`, `RatifiedAmendmentRecord`, `AmendmentRejectionRecord`

**Task Steps:**
1. Create `lib/constitutional-types/amendment-proposal.js` with 4 type schemas
2. `AmendmentProposal.class` must be one of `'I' | 'II' | 'III' | 'IV'`
3. `AmendmentProposal.proposer_deliberation_ref` must be present — RT-16 proposals originate from RT-11 deliberation only
4. Register in `index.js`
5. Run `node --check lib/constitutional-types/amendment-proposal.js`
6. Mark GAP-16-002 RESOLVED in Ledger

**Validation Method:**
- `node --check` exits 0
- `AmendmentProposal.class` enum I/II/III/IV documented
- `proposer_deliberation_ref` field present

**Rollback Plan:**
- Delete `amendment-proposal.js`; revert `index.js`

---

### W1-16 — Constitutional Types Registry Completion

| Field | Value |
|-------|-------|
| Task ID | W1-16 |
| Complexity | S |
| Risk | LOW |
| Change Class | Class D |
| Wave | 1 |

**Objective:** Finalize `lib/constitutional-types/index.js` to export all 35+ constitutional object types from a single require point. This is the Wave 1 exit verification task.

**Runtime Affected:** All runtimes (registry spans all 16).

**Files Affected:**
- MODIFY: `lib/constitutional-types/index.js` (finalize all requires and exports)

**Dependencies:** W1-02 through W1-15 all complete.

**Task Steps:**
1. Open `lib/constitutional-types/index.js`
2. Verify that all 14 type files created in W1-02 through W1-15 are required
3. Export all types under canonical names
4. Count: there must be ≥ 35 distinct exported type names
5. Run `node --check lib/constitutional-types/index.js`
6. Run `node -e "const t = require('./lib/constitutional-types/index.js'); console.log(Object.keys(t).length)"` — must print ≥ 35
7. Run `node --check server.js` to confirm nothing in the existing codebase was broken

**Expected Output:**
- `lib/constitutional-types/index.js` exports ≥ 35 types
- All existing tests pass

**Validation Method:**
1. `node -e "require('./lib/constitutional-types/index.js')"` exits 0
2. Type count ≥ 35 confirmed
3. `node --check server.js` exits 0
4. Run existing test suite — zero new failures

**Rollback Plan:**
- Revert `index.js` to the last known-good state from git
- If any W1 task introduced a breaking change to existing code, identify the file and revert it

---

### WAVE 1 EXIT GATE (Gate 2)

Execute Gate 2 verification per I2-IMPLEMENTATION-GATE-SPECIFICATION.md before beginning Wave 2.

**Minimum requirements to pass:**
- [ ] All W1-01 through W1-16 exit criteria satisfied
- [ ] `node -e "require('./lib/constitutional-types/index.js')"` exits 0
- [ ] Type count ≥ 35 confirmed
- [ ] `node --check server.js` passes
- [ ] No existing test suite failures introduced by Wave 1
- [ ] All 14 type files pass `node --check` individually
- [ ] `HistoricalStateQueryResult` exported with `status` field enum (required for W2-01)
- [ ] `ChangeRecord` exported (required for W2-03, W2-04)
- [ ] I2-APEX-IMPLEMENTATION-LEDGER.md updated with Wave 1 task states and GAP-16-002 resolution

**Gate 2 failure action:** Do not begin Wave 2. Identify which type file caused the failure. Fix and re-verify Gate 2.

---

## PART 3 — WAVE 2: CONSTITUTIONAL WIRING

**Purpose:** Wire existing implementations to emit and consume constitutional object types. Fix the four critical gaps (GAP-03-001, GAP-03-002, GAP-03-003, GAP-05-001). All existing logic is preserved — this wave is additive wrapping and extension, not replacement.

**Wave 2 entry condition:** Gate 2 PASS.

**Wave 2 exit condition:** Gate 3 PASS.

**Wave 2 critical path:**
```
W2-01 (getHistoricalState on gateway.js)
  └─ W2-02 (PETL Step 2 — CRITICAL)
W2-03 (ChangeRecord on fabric.js — HIGH)
  └─ W2-04 (Gate 6 — CRITICAL)
       └─ W2-05 (Stage 10 MPW)
            └─ W2-10 (RT-06 GCR evaluator)
```

W2-06 through W2-12 may proceed in parallel with the above critical path after their respective prerequisites.

**Wave 2 principle:** No existing logic is rewritten. New code wraps existing code to emit types. Constitutional gates are extended, not replaced. Every task is additive.

---

### W2-01 — RT-07: Add getHistoricalState() Interface

| Field | Value |
|-------|-------|
| Task ID | W2-01 |
| Complexity | M |
| Risk | MEDIUM |
| Change Class | Class B (Implementation Change — new method on preserved module) |
| IDR Required | Yes — IDR-002 (new method on RT-07 gateway) |
| Wave | 2 |
| Fixes | GAP-07-001 |
| Constitutional Basis | RT07-v1.0; I1-RUNTIME-MAPPING.md §RT-07 |

**Objective:** Add `getHistoricalState(timestamp)` method to `lib/memory/gateway.js` returning a formal `HistoricalStateQueryResult`. This method is the RT-07→RT-03 interface. It unblocks W2-02 (PETL Step 2 fix).

**Runtime Affected:** RT-07 (Memory Runtime).

**Files Affected:**
- MODIFY: `lib/memory/gateway.js` (add `getHistoricalState` method)
- CREATE: `migrations/089_historical_state_records.sql`

**Dependencies:** W1-05 (HistoricalStateQueryResult type), W1-16.

**Task Steps:**
1. Before editing: run `gitnexus_impact({target: "gateway", direction: "upstream"})` and assess blast radius
2. Add `getHistoricalState(timestamp)` to `lib/memory/gateway.js`
3. Method assembles relevant memory layers (episodic, semantic, decision) for the given timestamp
4. Returns `HistoricalStateQueryResult` with: `query_id` (UUID), `historical_layers`, `temporal_validity_ms`, `status` (`'VALID' | 'PARTIAL' | 'UNAVAILABLE'`)
5. Create `migrations/089_historical_state_records.sql` — `historical_state_records` table
6. Run `node -e "require('./lib/memory/gateway')"` to verify module loads
7. File IDR-002 before or immediately after the change

**Expected Output:**
- `lib/memory/gateway.js` with `getHistoricalState()` method
- `migrations/089_historical_state_records.sql`

**Validation Method:**
1. `node -e "require('./lib/memory/gateway')"` exits 0
2. Unit test: `getHistoricalState(timestamp)` returns object with `query_id`, `status` fields
3. Unit test: when memory unavailable, `status === 'UNAVAILABLE'` (does not throw)
4. `node --check server.js` passes

**Rollback Plan:**
1. Remove the `getHistoricalState` method from `gateway.js` using git revert of that function
2. Run `node -e "require('./lib/memory/gateway')"` to verify module still loads
3. Run down migration 089 if it was applied

---

### W2-02 — RT-03: Wire PETL Step 2 (Historical Contextualization)

| Field | Value |
|-------|-------|
| Task ID | W2-02 |
| Complexity | M |
| Risk | CRITICAL |
| Change Class | Class B (Implementation Change — modifies PETL execution path) |
| IDR Required | Yes — IDR-003 |
| Wave | 2 |
| Fixes | GAP-03-001 |
| Preservation | PETL 5-state machine preserved; 6-gate sequence preserved |
| Constitutional Basis | I1-ARCHITECTURE §15.1; R3-v1.0; I2-MIGRATION-CONTROL-SYSTEM.md LP-1 |

**Objective:** At PENDING→PREFLIGHT transition in `lib/runtime/execution-transaction.js`, call `gateway.getHistoricalState(timestamp)` and attach the `HistoricalStateQueryResult.query_id` to the transaction context. This fixes GAP-03-001 — PETL Step 2 currently has no RT-07 historical contextualization query.

**CRITICAL constraint:** If `result.status === 'UNAVAILABLE'`, log a warning but do NOT block the transaction. RT-07 unavailability must not halt the Constitutional Loop.

**Runtime Affected:** RT-03 (Constitutional Kernel Runtime), RT-07 (Memory Runtime).

**Files Affected:**
- MODIFY: `lib/runtime/execution-transaction.js` (PRESERVED artifact per I1-ARCHITECTURE Part 18 — modify with maximum care)

**Dependencies:** W2-01.

**Task Steps:**
1. Before editing: run `gitnexus_impact({target: "execution-transaction", direction: "upstream"})` — this is a PRESERVED artifact; understand full blast radius
2. File IDR-003 with Implementation Owner approval BEFORE making the change
3. In `execution-transaction.js`, locate the PENDING→PREFLIGHT state transition
4. At that transition point: call `gateway.getHistoricalState(req.timestamp || Date.now())`
5. Attach result reference: `ctx.historical_context_id = result.query_id`
6. If `result.status === 'UNAVAILABLE'`: log `WARN [RT-07] Historical context unavailable for tx ${tx_id}` and continue
7. Do NOT alter the PETL state machine itself — only add the query call within the existing PENDING→PREFLIGHT handler
8. Run `node --check lib/runtime/execution-transaction.js`

**Expected Output:**
- `execution-transaction.js` with Step 2 wiring
- `ctx.historical_context_id` present in every PREFLIGHT+ transaction

**Validation Method:**
1. `node --check lib/runtime/execution-transaction.js` exits 0
2. Integration test: PETL transaction context includes `historical_context_id` after PREFLIGHT
3. Integration test: transaction with RT-07 `UNAVAILABLE` still reaches COMMITTED state (non-blocking)
4. Verify PETL state machine states are unchanged: still `PENDING | PREFLIGHT | COMMITTED | EXECUTING | FINALIZED | ABORTED`

**Rollback Plan:**
1. Revert the specific change in `execution-transaction.js` using git
2. Run `node --check lib/runtime/execution-transaction.js`
3. Confirm PETL still transitions correctly through all states
4. Notify Implementation Owner

---

### W2-03 — RT-05: ChangeRecord Production in advanceClaim()

| Field | Value |
|-------|-------|
| Task ID | W2-03 |
| Complexity | M |
| Risk | HIGH |
| Change Class | Class B (Implementation Change — adds record production to preserved method) |
| IDR Required | Yes — IDR-004 |
| Wave | 2 |
| Fixes | GAP-05-001 |
| Preservation | 13-stage lifecycle preserved; fabric.js is a PRESERVED artifact |
| Constitutional Basis | D-3; A0-v1.1.1 §3.5; I1-ARCHITECTURE Part 18 |

**Objective:** Modify `lib/reality/fabric.js` `advanceClaim()` to produce a `ChangeRecord` and update the `HistoricalAnchor` on every stage transition. Add `getChangeHistory(claimId)` method. This is a critical path dependency for W2-04 (Gate 6).

**Runtime Affected:** RT-05 (Reality Fabric Runtime).

**Files Affected:**
- MODIFY: `lib/reality/fabric.js` (PRESERVED artifact — maximum care)
- CREATE: `migrations/080_change_records.sql`

**Dependencies:** W1-04 (ChangeRecord type, HistoricalAnchor type).

**Task Steps:**
1. Before editing: run `gitnexus_impact({target: "advanceClaim", direction: "upstream"})` — fabric.js is preserved; understand blast radius
2. File IDR-004 with Implementation Owner approval BEFORE making the change
3. Create migration `migrations/080_change_records.sql`:
   - Table `change_records`: append-only; columns match `ChangeRecord` type schema
   - Table `historical_anchors`: per-claim anchor; columns match `HistoricalAnchor` type schema
   - Both tables must be append-only (no UPDATE/DELETE permitted on `change_records`)
4. In `lib/reality/fabric.js`, after a successful stage transition in `advanceClaim()`:
   a. Produce a `ChangeRecord` object with all required fields
   b. Persist to `change_records` table
   c. Update `HistoricalAnchor` for the claim (`latest_change_id`, `last_modified_at`)
5. Add `getChangeHistory(claimId)` method: queries `change_records` for the given claim, returns `ChangeRecord[]`
6. Run `node --check lib/reality/fabric.js`
7. Run `node -e "require('./lib/reality/fabric')"` to verify module loads

**Expected Output:**
- `lib/reality/fabric.js` with ChangeRecord production in `advanceClaim()` and new `getChangeHistory()` method
- `migrations/080_change_records.sql`

**Validation Method:**
1. `node --check lib/reality/fabric.js` exits 0
2. `node -e "require('./lib/reality/fabric')"` exits 0
3. Integration test: after `advanceClaim()`, `change_records` table contains one new row
4. Integration test: `getChangeHistory(claimId)` returns array where each element has `change_id`, `stage_from`, `stage_to`, `timestamp` fields
5. Verify `HistoricalAnchor` updated: `last_modified_at` changes after each `advanceClaim()`
6. Verify 13-stage lifecycle is UNCHANGED — only the record-production side effect was added

**Rollback Plan:**
1. Revert the `advanceClaim()` changes and remove `getChangeHistory()` from `fabric.js` using git
2. Run `node -e "require('./lib/reality/fabric')"` to verify load
3. Run down migration 080 (drop `change_records` and `historical_anchors` tables)
4. Notify Implementation Owner

---

### W2-04 — RT-03: Add Gate 6 (Temporal Integrity)

| Field | Value |
|-------|-------|
| Task ID | W2-04 |
| Complexity | M |
| Risk | CRITICAL |
| Change Class | Class B |
| IDR Required | Yes — IDR-005 |
| Wave | 2 |
| Fixes | GAP-03-002 |
| Preservation | Gate sequence 1→2→3→4→5→6 strictly preserved; Gate 6 added as 6th; CLI-1 enforced |
| Constitutional Basis | C0-MANIFEST §5.2 item 9; D8 CLI-1; I1-ARCHITECTURE §15.1 Immutable Constraint |

**Objective:** Add Gate 6 to `lib/runtime/constitutional-gate.js`. Gate 6 checks temporal integrity by calling `fabric.getChangeHistory(claimId)` — NOT `gateway.getHistoricalState()`. This is a constitutional constraint from C0-MANIFEST §5.2 item 9.

**CRITICAL constraint:** Gate 6 MUST call `fabric.getChangeHistory()` (RT-05). It must NEVER call `gateway.getHistoricalState()` (RT-07). An implementation that queries RT-07 for Gate 6 is a constitutional violation per C0-MANIFEST §5.2 item 9.

**Runtime Affected:** RT-03 (Constitutional Kernel Runtime), RT-05 (Reality Fabric Runtime).

**Files Affected:**
- MODIFY: `lib/runtime/constitutional-gate.js` (add Gate 6 at position 6)

**Dependencies:** W2-03 (getChangeHistory must exist before Gate 6 can call it).

**Task Steps:**
1. Before editing: run `gitnexus_impact({target: "constitutional-gate", direction: "upstream"})` — assess blast radius
2. File IDR-005 with Implementation Owner approval BEFORE making the change
3. Open `lib/runtime/constitutional-gate.js`
4. Locate Gates 1–5 — confirm their sequence; do not alter them
5. Add Gate 6 as the LAST gate (after Gate 5):
   a. Gate 6 calls `fabric.getChangeHistory(claimRef)` for the primary claim ref in the operation
   b. If the most recent ChangeRecord timestamp exceeds `temporal_validity_ms` from the transaction context: Gate 6 DENY
   c. Gate 6 PASS: the most recent ChangeRecord is within temporal validity window
6. Verify gate order in code: Gates execute in sequence 1→2→3→4→5→6 (D8 CLI-1 prohibits reordering)
7. Run `node --check lib/runtime/constitutional-gate.js`

**Expected Output:**
- `constitutional-gate.js` with Gate 6 added as the 6th gate
- Gate 6 queries `fabric.getChangeHistory()` — NOT `gateway.getHistoricalState()`

**Validation Method:**
1. `node --check lib/runtime/constitutional-gate.js` exits 0
2. Code review: Gate 6 contains `fabric.getChangeHistory()` call — confirm NO reference to `gateway.getHistoricalState()`
3. Unit test: Gate 6 DENY when ChangeRecord timestamp indicates stale object
4. Unit test: Gate 6 PASS when ChangeRecord is within validity window
5. Verify gate count: exactly 6 gates in sequence

**Rollback Plan:**
1. Revert Gate 6 addition from `constitutional-gate.js` using git
2. Run `node --check lib/runtime/constitutional-gate.js`
3. Verify Gates 1–5 are intact and undisturbed
4. Notify Implementation Owner — this is a CRITICAL-risk rollback

---

### W2-05 — RT-03: Add Stage 10 MPW Signal

| Field | Value |
|-------|-------|
| Task ID | W2-05 |
| Complexity | S |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-006 |
| Wave | 2 |
| Fixes | GAP-03-003 |
| Constitutional Basis | R3-v1.0; Constitutional Loop Phase 10 (MPW signal to RT-06) |

**Objective:** After every EXECUTING→FINALIZED transition in `execution-transaction.js`, emit `constitutional.stage10.mpw` event on `lib/event-bus.js`. This is non-blocking (Class B async). Unblocks W2-10 (RT-06 GCR evaluator).

**Runtime Affected:** RT-03 (event emitter), RT-06 (event consumer — via W2-10).

**Files Affected:**
- MODIFY: `lib/runtime/execution-transaction.js` (add emit at FINALIZED transition)

**Dependencies:** W1-12 (CoherenceViolationRecord type — needed by RT-06 consumer in W2-10).

**Task Steps:**
1. In `execution-transaction.js`, locate the EXECUTING→FINALIZED transition
2. After the state is set to FINALIZED: `eventBus.emit('constitutional.stage10.mpw', { tx_id, committed_object_ids, loop_phase })`
3. The emit is non-blocking — do NOT await it
4. Run `node --check lib/runtime/execution-transaction.js`

**Expected Output:**
- `execution-transaction.js` emits `constitutional.stage10.mpw` after every FINALIZED transition

**Validation Method:**
1. `node --check lib/runtime/execution-transaction.js` exits 0
2. Unit test: after EXECUTING→FINALIZED, event bus receives `constitutional.stage10.mpw` event
3. Confirm emission is non-blocking (does not affect FINALIZED state timing)

**Rollback Plan:**
1. Remove the `eventBus.emit()` call from the FINALIZED handler
2. Run `node --check lib/runtime/execution-transaction.js`

---

### W2-06 — RT-09: Knowledge Layer Creation

| Field | Value |
|-------|-------|
| Task ID | W2-06 |
| Complexity | M |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-007 |
| Wave | 2 |
| Constitutional Basis | A0-v1.1.1 §3.9; I1-ARCHITECTURE Zone 9 |

**Objective:** Create `lib/knowledge/record.js` and `lib/knowledge/evidence-pipeline.js`. Wire `lib/intelligence/knowledge-validator.js` to produce formal `KnowledgeRecord` types. Apply migration 083.

**Runtime Affected:** RT-09 (Knowledge Runtime).

**Files Affected:**
- CREATE: `lib/knowledge/record.js`
- CREATE: `lib/knowledge/evidence-pipeline.js`
- MODIFY: `lib/intelligence/knowledge-validator.js` (wrap output with KnowledgeRecord type)
- CREATE: `migrations/083_knowledge_records.sql`

**Dependencies:** W1-07 (EvidenceObject, KnowledgeRecord types), W1-16.

**Task Steps:**
1. Create migration `migrations/083_knowledge_records.sql` — `knowledge_records` table
2. Create `lib/knowledge/record.js` — KnowledgeRecord CRUD with `lineage_ref` pointing to `ObservationRecord.record_id` (INV-4)
3. Create `lib/knowledge/evidence-pipeline.js` — `ObservationRecord → EvidenceObject → KnowledgeRecord` pipeline
4. Wrap `knowledge-validator.js` output with formal `KnowledgeRecord` type
5. Run `node -e "require('./lib/knowledge/record')"` and `node -e "require('./lib/knowledge/evidence-pipeline')"`

**Validation Method:**
1. `node -e "require('./lib/knowledge/record')"` exits 0
2. `node -e "require('./lib/knowledge/evidence-pipeline')"` exits 0
3. `KnowledgeRecord.lineage_ref` traces to `ObservationRecord.record_id` (INV-4 requirement)
4. Migration 083 applied successfully

**Rollback Plan:**
1. Delete `lib/knowledge/record.js` and `lib/knowledge/evidence-pipeline.js`
2. Revert `knowledge-validator.js` wrapping changes
3. Run down migration 083

---

### W2-07 — RT-12: Decision Compliance Gate Creation

| Field | Value |
|-------|-------|
| Task ID | W2-07 |
| Complexity | M |
| Risk | HIGH |
| Change Class | Class B |
| IDR Required | Yes — IDR-008 |
| Wave | 2 |
| Constitutional Basis | RT12-v1.0; C0-MANIFEST §5.2 items 3, 4; I1-ARCHITECTURE Zone 12 |

**Objective:** Create `lib/decision/compliance-gate.js` wrapping `decision-lattice.js` output as `ComplianceVerificationRecord`. Create `lib/decision/objects.js` for `OpenActionRegisterEntry`. Apply migration 084.

**Runtime Affected:** RT-12 (Decision Runtime).

**Files Affected:**
- CREATE: `lib/decision/compliance-gate.js`
- CREATE: `lib/decision/objects.js`
- MODIFY: `civilisation/consensus.js` (submit CivilizationalDecisionProposal to compliance gate before sealing)
- MODIFY: `lib/runtime/constitutional-gate.js` (Gate 5 validates typed ComplianceVerificationRecord)
- CREATE: `migrations/084_compliance_records.sql`

**Dependencies:** W1-10 (ComplianceVerificationRecord, CivilizationalDecision types), W1-16.

**Task Steps:**
1. Create migration `migrations/084_compliance_records.sql` — `compliance_records` table
2. Create `lib/decision/compliance-gate.js`: wraps `decision-lattice.js` verdict as `ComplianceVerificationRecord`
3. Create `lib/decision/objects.js`: OpenActionRegisterEntry management (append to `open_action_register` DB table or equivalent)
4. Modify `civilisation/consensus.js`: before sealing a decision, submit the `CivilizationalDecisionProposal` to `compliance-gate.js`
5. Modify Gate 5 in `constitutional-gate.js`: validate that the compliance check produced a typed `ComplianceVerificationRecord` (not raw boolean)
6. Run `node -e "require('./lib/decision/compliance-gate')"` to verify load
7. Run `node --check lib/runtime/constitutional-gate.js`

**Validation Method:**
1. `node -e "require('./lib/decision/compliance-gate')"` exits 0
2. Gate 5 rejects decisions without a valid `ComplianceVerificationRecord`
3. `ComplianceVerificationRecord.verdict` is `'COMPLIANT'` or `'NON_COMPLIANT'` — not raw boolean
4. Migration 084 applied

**Rollback Plan:**
1. Delete `lib/decision/compliance-gate.js` and `lib/decision/objects.js`
2. Revert `consensus.js` changes
3. Revert Gate 5 changes in `constitutional-gate.js`
4. Run down migration 084

---

### W2-08 — RT-13: EffectExpectationRecord at COMMITTED State

| Field | Value |
|-------|-------|
| Task ID | W2-08 |
| Complexity | M |
| Risk | HIGH |
| Change Class | Class B |
| IDR Required | Yes — IDR-009 |
| Wave | 2 |
| Enforcement | INV-7: EffectExpectationRecord must be persisted BEFORE EXECUTING state |
| Constitutional Basis | A0-v1.1.1 §3.13; I1-ARCHITECTURE INV-7 |

**Objective:** Create `lib/action/effect-expectation.js`. At COMMITTED state (before EXECUTING) in `execution-transaction.js`, produce and persist `EffectExpectationRecord`. Apply migration 085.

**Runtime Affected:** RT-13 (Action Runtime).

**Files Affected:**
- CREATE: `lib/action/effect-expectation.js`
- CREATE: `lib/action/projection-record.js`
- MODIFY: `lib/runtime/execution-transaction.js` (add EffectExpectationRecord production at COMMITTED)
- CREATE: `migrations/085_effect_expectations.sql`

**Dependencies:** W1-11 (EffectExpectationRecord type).

**Task Steps:**
1. Create migration `migrations/085_effect_expectations.sql` — `effect_expectations` table (append-only)
2. Create `lib/action/effect-expectation.js` with `produce(ctx)` method that returns `EffectExpectationRecord`
3. Create `lib/action/projection-record.js` wrapping `outcome-registry.js`
4. In `execution-transaction.js`, at COMMITTED state (the state where the transaction is committed but not yet executing): call `effectExpectation.produce(ctx)` and persist the result before transitioning to EXECUTING
5. Run `node --check lib/runtime/execution-transaction.js`
6. Run `node -e "require('./lib/action/effect-expectation')"`

**Validation Method:**
1. `node -e "require('./lib/action/effect-expectation')"` exits 0
2. Integration test: `effect_expectations` table contains a row BEFORE EXECUTING state is entered (INV-7)
3. Migration 085 applied

**Rollback Plan:**
1. Delete `lib/action/effect-expectation.js` and `lib/action/projection-record.js`
2. Revert `execution-transaction.js` changes
3. Run down migration 085

---

### W2-09 — RT-14: ConsequenceObservationRecord

| Field | Value |
|-------|-------|
| Task ID | W2-09 |
| Complexity | M |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-010 |
| Wave | 2 |
| Enforcement | INV-6: every action must have a ConsequenceObservationRecord |
| Constitutional Basis | A0-v1.1.1 §3.14; I1-ARCHITECTURE INV-6 |

**Objective:** Create `lib/reflection/consequence-record.js`. Wrap `outcome-registry.js` to produce `ObservedConsequenceRecord`. Refactor `middleware/civilization-kernel.js` post-response hook to emit `constitutional.loop.consequence`. Apply migration 086.

**Runtime Affected:** RT-14 (Reflection Runtime).

**Files Affected:**
- CREATE: `lib/reflection/consequence-record.js`
- MODIFY: `lib/systems/outcome-registry.js` (wrap output with ObservedConsequenceRecord type)
- MODIFY: `middleware/civilization-kernel.js` (post-hook emits constitutional.loop.consequence)
- CREATE: `migrations/086_consequence_observations.sql`

**Dependencies:** W2-08 (EffectExpectationRecord must exist before ObservedConsequenceRecord can reference it).

**Task Steps:**
1. Create migration `migrations/086_consequence_observations.sql`
2. Create `lib/reflection/consequence-record.js` with `produce(effectExpectationRef, observedOutcome)` method
3. Wrap `outcome-registry.js` output with `ObservedConsequenceRecord` type — each outcome record must reference the original `EffectExpectationRecord`
4. Modify `middleware/civilization-kernel.js` post-response hook: emit `constitutional.loop.consequence` event with `{ consequence_id, action_ref, expectation_ref }`
5. Run `node -e "require('./lib/reflection/consequence-record')"`

**Validation Method:**
1. `node -e "require('./lib/reflection/consequence-record')"` exits 0
2. Integration test: after every FINALIZED action, `consequence_observations` table has a new row
3. `constitutional.loop.consequence` event emitted from `civilization-kernel.js` post-hook
4. Migration 086 applied

**Rollback Plan:**
1. Delete `lib/reflection/consequence-record.js`
2. Revert `outcome-registry.js` changes
3. Revert `civilization-kernel.js` post-hook changes
4. Run down migration 086

---

### W2-10 — RT-06: GCR Evaluator Creation

| Field | Value |
|-------|-------|
| Task ID | W2-10 |
| Complexity | L |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-011 |
| Wave | 2 |
| Constitutional Basis | R6-v1.1.1; A0-v1.1.1 §3.6; I1-ARCHITECTURE Zone 6 |

**Objective:** Create `lib/coherence/gcr-evaluator.js` implementing GCR-1 through GCR-7. Subscribe to `constitutional.stage10.mpw` event. Produce `CoherenceViolationRecord` for every violation. Apply migration 081.

**Runtime Affected:** RT-06 (Coherence Runtime — entire module is MISSING; this creates it).

**Files Affected:**
- CREATE: `lib/coherence/gcr-evaluator.js`
- CREATE: `lib/coherence/domain-status.js`
- CREATE: `migrations/081_coherence_violations.sql`

**Dependencies:** W2-05 (stage10.mpw event must exist before GCR evaluator can subscribe to it), W1-12 (CoherenceViolationRecord type, DomainCoherenceStatus type).

**Task Steps:**
1. Create migration `migrations/081_coherence_violations.sql` — `coherence_violations`, `domain_coherence_status` tables
2. Create `lib/coherence/gcr-evaluator.js`:
   a. Subscribe to `constitutional.stage10.mpw` event from event bus
   b. On each event: evaluate committed objects against all 7 coherence registers (GCR-1 through GCR-7)
   c. For each violation: produce `CoherenceViolationRecord` and persist to DB
   d. Emit `constitutional.coherence.violation` event for each violation (consumed by RT-04 and RT-15)
3. Create `lib/coherence/domain-status.js`: produce `DomainCoherenceStatus` per evaluation cycle
4. Run `node -e "require('./lib/coherence/gcr-evaluator')"`
5. Run `node -e "require('./lib/coherence/domain-status')"`

**Validation Method:**
1. `node -e "require('./lib/coherence/gcr-evaluator')"` exits 0
2. Integration test: emit `constitutional.stage10.mpw` — evaluator receives it and runs GCR-1 through GCR-7
3. Integration test: when a GCR violation is present, `coherence_violations` table has a new row
4. `constitutional.coherence.violation` event emitted after violation detection
5. Migration 081 applied

**Rollback Plan:**
1. Delete `lib/coherence/gcr-evaluator.js` and `lib/coherence/domain-status.js`
2. Run down migration 081

---

### W2-11 — RT-10/RT-11: Wrap SIE as CUM Type

| Field | Value |
|-------|-------|
| Task ID | W2-11 |
| Complexity | M |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-012 |
| Wave | 2 |
| Constitutional Basis | A0-v1.1.1 §3.10–3.11; I1-ARCHITECTURE PAIR 32 |

**Objective:** Wrap `lib/intelligence/sie.js` output with formal `CivilizationUnderstandingModel` type. Wire PAIR 32 — deliver CUM to RT-11 via `constitutional.loop.understanding` event.

**Runtime Affected:** RT-10 (Intelligence Runtime), RT-11 (Civilization Intelligence Runtime).

**Files Affected:**
- MODIFY: `lib/intelligence/sie.js` (wrap synthesis output as CivilizationUnderstandingModel)
- MODIFY: `civilisation/consensus.js` (subscribe to constitutional.loop.understanding event — PAIR 32)

**Dependencies:** W1-08 (DomainUnderstandingModel type), W1-09 (CivilizationUnderstandingModel, CivilizationalDecisionProposal types).

**Task Steps:**
1. Before editing `sie.js`: run `gitnexus_impact({target: "sie", direction: "upstream"})` — this is a WRAP operation (not replacement)
2. Modify `lib/intelligence/sie.js`: wrap synthesis output object as `CivilizationUnderstandingModel` type
3. After synthesis: emit `constitutional.loop.understanding` event with the CUM object
4. Modify `civilisation/consensus.js`: subscribe to `constitutional.loop.understanding` and consume CUM for deliberation (PAIR 32 wiring)
5. Verify II-12: if CUM is invalidated, RT-11 is notified via the event channel

**Validation Method:**
1. `node -e "require('./lib/intelligence/sie')"` exits 0
2. Integration test: after SIE synthesis, `constitutional.loop.understanding` event emitted
3. `civilisation/consensus.js` receives CUM from event (PAIR 32 wired)
4. CUM object passes `CivilizationUnderstandingModel` schema validation

**Rollback Plan:**
1. Revert `sie.js` CUM wrapping
2. Revert `consensus.js` event subscription
3. Verify existing SIE and consensus behavior is restored

---

### W2-12 — New Route Files (Wave 2 APIs)

| Field | Value |
|-------|-------|
| Task ID | W2-12 |
| Complexity | M |
| Risk | LOW |
| Change Class | Class B |
| IDR Required | Yes — IDR-013 |
| Wave | 2 |
| Constitutional Basis | I1-ARCHITECTURE Part 11 (API ownership table) |

**Objective:** Create new route files for all Wave 2 runtimes. All route files must define an internal sub-prefix matching the filename (CLAUDE.md rule) to prevent route collision under `_loadAgentRoutes` flat-mount.

**Runtime Affected:** RT-01, RT-02, RT-06, RT-09, RT-12, RT-13, RT-14.

**Files Affected:**
- CREATE: `routes/identity.js` — internal prefix `/identity/`, namespace `/api/identity/*`
- CREATE: `routes/authority.js` — internal prefix `/authority/`, namespace `/api/authority/*`
- CREATE: `routes/coherence.js` — internal prefix `/coherence/`, namespace `/api/coherence/*`
- CREATE: `routes/knowledge.js` — internal prefix `/knowledge/`, namespace `/api/knowledge/*`
- CREATE: `routes/decisions.js` — internal prefix `/decisions/`, namespace `/api/decisions/*`
- CREATE: `routes/actions.js` — internal prefix `/actions/`, namespace `/api/actions/*`
- CREATE: `routes/reflection.js` — internal prefix `/reflection/`, namespace `/api/reflection/*`
- MODIFY: `server.js` (mount all 7 new route files)

**Dependencies:** W2-06 (knowledge routes require knowledge layer), W2-07 (decision routes require compliance gate).

**Task Steps:**
1. For each of the 7 routes: create the file with the internal sub-prefix matching the filename
2. Add at minimum one health-check route per file: `router.get('/<name>/status', ...)` returning `{ runtime: 'RT-NN', status: 'active' }`
3. Mount all 7 route files in `server.js`
4. Run `node --check server.js` after all 7 are mounted
5. Run `node -e "require('./server')"` to verify no MODULE_NOT_FOUND errors

**Validation Method:**
1. `node --check server.js` exits 0
2. `node -e "require('./server')"` exits 0 (no MODULE_NOT_FOUND)
3. Each route file passes `node --check` individually
4. Each route has an internal sub-prefix matching its filename

**Rollback Plan:**
1. Remove all 7 new route files
2. Revert `server.js` to remove the 7 mount calls
3. Run `node --check server.js`

---

### WAVE 2 EXIT GATE (Gate 3)

Execute Gate 3 verification per I2-IMPLEMENTATION-GATE-SPECIFICATION.md before beginning Wave 3.

**Minimum requirements to pass:**
- [ ] GAP-03-001 resolved — `ctx.historical_context_id` present in every PREFLIGHT+ PETL transaction
- [ ] GAP-03-002 resolved — Gate 6 operational; queries `fabric.getChangeHistory()` not `gateway.getHistoricalState()`
- [ ] GAP-03-003 resolved — `constitutional.stage10.mpw` emitted after every FINALIZED transition
- [ ] GAP-05-001 resolved — `ChangeRecord` persisted after every `advanceClaim()`
- [ ] GAP-07-001 resolved — `getHistoricalState()` on gateway returns `HistoricalStateQueryResult`
- [ ] Migrations 080, 081, 083, 084, 085, 086, 089 applied
- [ ] `node --check server.js` passes
- [ ] All new modules load without `MODULE_NOT_FOUND` errors
- [ ] IDRs 002–013 filed and approved
- [ ] Gate 3 critical failure check passed: Gate 6 does NOT query RT-07 (constitutional violation of C0-MANIFEST §5.2 item 9)

**Gate 3 failure action:** Do not begin Wave 3. Identify which check failed. If the Gate 6 constitutional violation check fails, treat as emergency per I2-IMPLEMENTATION-GOVERNANCE-MODEL.md Part 7.

---

## PART 4 — WAVE 3: MISSING RUNTIMES

**Purpose:** Implement the three major missing systems. These are new implementations, not wrapping — higher risk than Waves 1–2. Staging verification required before production deployment.

**Wave 3 entry condition:** Gate 3 PASS.

**Wave 3 exit condition:** Gate 4 PASS.

**Wave 3 principle:** Each task here is implementing functionality that has no predecessor in the repository. The work is more complex, the risk is higher, and the verification burden is greater.

---

### W3-01 — RT-16: Full Amendment Pipeline (XL)

| Field | Value |
|-------|-------|
| Task ID | W3-01 |
| Complexity | XL |
| Risk | HIGH |
| Change Class | Class B |
| IDR Required | Yes — IDR-014 (XL task; detailed options analysis required) |
| Wave | 3 |
| Fixes | GAP-16-001, GAP-16-002 |
| Constitutional Constraint | RT-16 absent from all 10 loop phases (II-08); Class I amendments require human authorization (D7 §12.2); C0-ERRATA-016A: derive from D7 Part 12, not RS-13/RS-16 |
| Constitutional Basis | A1-v1.2 §12.8; D7 Part 12; R16-v1.0 |

**Objective:** Implement the full 15-step amendment pipeline. This is the largest single task in the implementation plan.

**Runtime Affected:** RT-16 (Amendment Runtime), RT-11 (proposal originator), RT-03 (amendment commit routes through all 6 gates), RT-04 (Preservation Audit).

**Files Affected:**
- CREATE: `lib/amendment/pipeline.js` — 15-step state machine
- CREATE: `lib/amendment/classifier.js` — Class I/II/III/IV determination
- CREATE: `lib/amendment/preservation-audit.js` — PreservationAuditRecord interface to RT-04
- CREATE: `routes/amendments.js` — `/api/amendments/*`
- MODIFY: `server.js` (mount amendments route)
- CREATE: `migrations/087_amendments.sql`

**Dependencies:** Wave 2 complete; W1-15 (RT-16 type definitions); W1-13 (PreservationAuditRecord type).

**Task Steps:**
1. Create migration `migrations/087_amendments.sql` — `amendments` table
2. Create `lib/amendment/classifier.js` — determines Class I/II/III/IV from proposal content
3. Create `lib/amendment/preservation-audit.js` — produces `PreservationAuditRecord` and submits to RT-04
4. Create `lib/amendment/pipeline.js` implementing the 15-step state machine per A1-v1.2 §12.8:
   - Step 1: Proposal receipt — verify caller is from RT-11 deliberation only (reject all other callers)
   - Step 2: Classification via `classifier.js`
   - Step 3: Registry registration
   - Step 4: [Class I only] Human actor authorization gate — BLOCK until human approves (D7 §12.2)
   - Step 5: RT-04 Preservation Audit — BLOCK until `preservation-audit.js` returns PASS
   - Step 6: Constitutional impact assessment
   - Step 7: Deliberation announcement (event broadcast)
   - Step 8: Deliberation period (configurable duration)
   - Step 9: Vote collection
   - Step 10: Quorum verification
   - Step 11: Tally
   - Step 12: Amendment commit — must call `execution-transaction.begin()` routing through all 6 gates (PAIR 61)
   - Step 13: [On PASS] Produce `RatifiedAmendmentRecord`
   - Step 14: [On PASS] Broadcast `constitutional.amendment.ratified` to all runtimes
   - Step 15: [On FAIL] Produce `AmendmentRejectionRecord`
5. Create `routes/amendments.js` — `/api/amendments/*` with internal sub-prefix `/amendments/`
6. Mount in `server.js`
7. Migrate `lib/constitution/amendments.json` content into the `amendments` DB table
8. Run `node -e "require('./lib/amendment/pipeline')"`
9. Run `node --check server.js`

**Constitutional self-check (must verify before marking complete):**
- RT-16 self-initiation impossible: `pipeline.receive()` checks caller — rejects calls not from RT-11 deliberation
- RT-16 code does NOT appear in `civilization-kernel.js` loop handlers (II-08)
- Class I amendment blocks at Step 4 without human authorization
- PreservationAuditRecord produced and RT-04 approval required before Class I proceeds (Step 5)
- Amendment commit at Step 12 routes through PETL all 6 gates (PAIR 61)
- Amendment pipeline derives from D7 Part 12 — not RS-13/RS-16 incorrect citations (C0-ERRATA-016A)

**Validation Method:**
1. `node -e "require('./lib/amendment/pipeline')"` exits 0
2. `node --check server.js` exits 0
3. Unit test: `pipeline.receive()` with non-RT-11 caller → rejected
4. Unit test: Class I proposal blocks at Step 4 pending human authorization
5. Integration test: full amendment cycle — proposal → Class II path → ratification → `constitutional.amendment.ratified` broadcast
6. Verify: no RT-16 code in `civilization-kernel.js` (grep for `amendment` or `rt-16` or `rt16` in `civilization-kernel.js` — should be absent from loop handlers)
7. Migration 087 applied

**Rollback Plan:**
1. Delete `lib/amendment/` directory
2. Delete `routes/amendments.js`
3. Remove amendments route mount from `server.js`
4. Revert `amendments.json` migration if applied
5. Run down migration 087
6. Run `node --check server.js`

---

### W3-02 — RT-08: Observation Boundary Implementation

| Field | Value |
|-------|-------|
| Task ID | W3-02 |
| Complexity | L |
| Risk | HIGH |
| Change Class | Class B |
| IDR Required | Yes — IDR-015 |
| Wave | 3 |
| Enforcement | II-06: no data enters Constitutional Loop without ObservationRecord |
| Constitutional Basis | D5 PI-6 Boundary Integrity; A0-v1.1.1 §3.8; I1-ARCHITECTURE Zone 6 |

**Objective:** Create `lib/observation/boundary.js` implementing Zone 6 enforcement. No external data enters the Constitutional Loop without producing an `ObservationRecord`. Refactor `lib/observer-health/index.js` to produce typed `ObservationRecord`. Add `openConsequenceMonitor()` interface. Apply migration 082.

**Runtime Affected:** RT-08 (Observation Runtime).

**Files Affected:**
- CREATE: `lib/observation/boundary.js`
- CREATE: `lib/observation/record.js`
- MODIFY: `lib/observer-health/index.js` (wrap observations as ObservationRecord)
- MODIFY: `routes/observatory.js` (serve `/api/observations/` namespace)
- CREATE: `migrations/082_observation_records.sql`

**Dependencies:** Wave 2 complete; W1-06 (ObservationRecord type, ObservationChannelRecord type).

**Task Steps:**
1. Create migration `migrations/082_observation_records.sql` — `observation_records` table
2. Create `lib/observation/record.js` — `ObservationRecord` factory
3. Create `lib/observation/boundary.js` — validates all incoming observations; produces `ObservationRecord` before any data is passed to `lib/knowledge/`
4. Refactor `lib/observer-health/index.js`: call `lib/observation/record.js` to produce typed `ObservationRecord`
5. Add `openConsequenceMonitor(projectionRecord)` to `lib/observer-health/index.js`
6. Refactor `routes/observatory.js` to serve `/api/observations/` namespace with correct internal sub-prefix
7. Run `node -e "require('./lib/observation/boundary')"`

**Constitutional self-check:**
- II-06 enforcement: no data may reach `lib/knowledge/` without passing through `lib/observation/boundary.js`

**Validation Method:**
1. `node -e "require('./lib/observation/boundary')"` exits 0
2. Integration test: external data submitted → `observation_records` table has new row before it reaches knowledge layer (II-06)
3. `openConsequenceMonitor()` function exists on `observer-health/index.js`
4. Migration 082 applied

**Rollback Plan:**
1. Delete `lib/observation/boundary.js` and `lib/observation/record.js`
2. Revert `observer-health/index.js` changes
3. Revert `routes/observatory.js` changes
4. Run down migration 082

---

### W3-03 — RT-01: Identity Lifecycle Module

| Field | Value |
|-------|-------|
| Task ID | W3-03 |
| Complexity | M |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-016 |
| Wave | 3 |
| Constitutional Basis | A0-v1.1.1 §3.1; R1-v1.1; I1-ARCHITECTURE Zone 1 |

**Objective:** Create `lib/identity/record.js` and `lib/identity/manifest.js`. Refactor `lib/memory/access-controller.js` to return formal `ActorProfile`. Refactor `middleware/civilization-kernel.js` PHASE 2 to hydrate `ActorProfile`. Apply migration 088.

**Runtime Affected:** RT-01 (Identity Runtime).

**Files Affected:**
- CREATE: `lib/identity/record.js`
- CREATE: `lib/identity/manifest.js`
- MODIFY: `lib/memory/access-controller.js` (return ActorProfile)
- MODIFY: `middleware/civilization-kernel.js` PHASE 2 (hydrate ActorProfile to request context)
- CREATE: `migrations/088_identity_records.sql`

**Dependencies:** W1-02 (ActorProfile type, IdentityConflictRecord type), W2-01.

**Task Steps:**
1. Create migration `migrations/088_identity_records.sql` — `identity_records` table
2. Create `lib/identity/record.js` — wraps `humans`/`agents` DB rows as `ActorProfile`
3. Create `lib/identity/manifest.js` — `IdentityManifest` management (per-actor identity manifest)
4. Refactor `lib/memory/access-controller.js`: call `lib/identity/record.js` and return `ActorProfile` not raw DB row
5. Refactor `middleware/civilization-kernel.js` PHASE 2: hydrate `ActorProfile` and attach to request context as `req.actorProfile`
6. Run `node -e "require('./lib/identity/record')"`
7. Run `node --check middleware/civilization-kernel.js`

**Validation Method:**
1. `node -e "require('./lib/identity/record')"` exits 0
2. `lib/memory/access-controller.js` returns `ActorProfile` (not raw DB row)
3. `middleware/civilization-kernel.js` PHASE 2 attaches `req.actorProfile` with correct type
4. Migration 088 applied

**Rollback Plan:**
1. Delete `lib/identity/record.js` and `lib/identity/manifest.js`
2. Revert `access-controller.js` changes
3. Revert `civilization-kernel.js` PHASE 2 changes
4. Run down migration 088

---

### W3-04 — RT-15: Domain Instances 11 and 12

| Field | Value |
|-------|-------|
| Task ID | W3-04 |
| Complexity | M |
| Risk | LOW |
| Change Class | Class B |
| IDR Required | Yes — IDR-017 |
| Wave | 3 |
| Fixes | GAP-15-001 |
| Constitutional Basis | A0-v1.1.1 §3.15; C0-MANIFEST §5.2 item 6 (RT-15 is twelve-instance runtime) |

**Objective:** Create `domains/dom-000011/` and `domains/dom-000012/` following the exact structure of existing domain modules. Register both in `civilisation/domain-loader.js`. Verify `domains.length === 12`.

**Runtime Affected:** RT-15 (Domain Runtime — instances 11 and 12 of 12).

**Files Affected:**
- CREATE: `domains/dom-000011/src/runtime/index.js`
- CREATE: `domains/dom-000011/src/config/` (configuration files)
- CREATE: `domains/dom-000011/src/data/` (data directory)
- CREATE: `domains/dom-000012/` (same structure)
- MODIFY: `civilisation/domain-loader.js` (register both new domains)

**Dependencies:** W1-14 (DomainProfile type).

**Task Steps:**
1. Identify the identities of domains 11 and 12 per constitutional specification (A0-v1.1.1 §3.15 domain registry)
2. Read existing domain structure from `domains/dom-000001/` to understand the exact directory/file pattern
3. Create `domains/dom-000011/` with identical structure to DOM-000001
4. Create `domains/dom-000012/` with identical structure to DOM-000001
5. Register both in `civilisation/domain-loader.js`
6. Add assertion in `domain-loader.js`: `if (domains.length !== 12) throw new Error('Domain count invariant violated')`
7. Verify `DOM-000001` still initializes first (II-11 — initialization order preserved)

**Constitutional self-check:** II-11: DOM-000001 must initialize first. Verify init order is unchanged after adding domains 11 and 12.

**Validation Method:**
1. `node -e "require('./civilisation/domain-loader')"` exits 0
2. Domain count assertion passes: `domains.length === 12`
3. DOM-000001 initializes first (check init log ordering)
4. GAP-15-001 marked resolved

**Rollback Plan:**
1. Delete `domains/dom-000011/` and `domains/dom-000012/`
2. Revert `domain-loader.js` to remove registrations and count assertion
3. Verify `domain-loader.js` still loads with existing domain count

---

### W3-05 — Full Constitutional Loop Wiring

| Field | Value |
|-------|-------|
| Task ID | W3-05 |
| Complexity | L |
| Risk | HIGH |
| Change Class | Class B |
| IDR Required | Yes — IDR-018 |
| Wave | 3 |
| Fixes | GAP-PIPE-001 |
| Constitutional Basis | A1-v1.2 §15.2; I1-ARCHITECTURE PAIR 59, PAIR 61; II-08 |

**Objective:** Wire the full Constitutional Loop end-to-end. All 10 loop phases must be traversable. Each phase boundary must produce a typed constitutional object delivered to the next phase.

**Runtime Affected:** All RT-01 through RT-16.

**Files Affected:**
- MODIFY: `middleware/civilization-kernel.js` (wire all 10 loop phases; add phase annotations)
- MODIFY: `civilisation/consensus.js` (wire PAIR 59: RT-11 → RT-16)
- MODIFY: `lib/amendment/pipeline.js` (wire PAIR 61: RT-16 → RT-03 all 6 gates)
- MODIFY: `middleware/civilization-kernel.js` (wire Phase 9→10 loop-back via constitutional.loop.consequence → RT-08)

**Dependencies:** W2-01 through W2-11, W3-01 through W3-04 all complete.

**Task Steps:**
1. Open `middleware/civilization-kernel.js` — map all existing loop phase handlers to their A1-v1.2 §15.2 phase numbers
2. Add loop phase annotations to match A1-v1.2 §15.2 exactly
3. Wire PAIR 59: in `civilisation/consensus.js`, after deliberation produces a `CivilizationalDecisionProposal`, submit to `lib/amendment/pipeline.receive()` (RT-11 → RT-16 path)
4. Wire PAIR 61: in `lib/amendment/pipeline.js` Step 12, confirm `execution-transaction.begin()` is called with all 6 gates required
5. Wire Phase 9→10 loop-back: subscribe RT-08 `openConsequenceMonitor()` to `constitutional.loop.consequence` event (re-observation after action)
6. End-to-end trace: submit a test operation through all 10 phases; verify each phase boundary produces a typed constitutional object

**Constitutional self-check:**
- II-08: RT-16 code is absent from `civilization-kernel.js` loop handlers — amendment pipeline is called from RT-11 deliberation, not from the loop directly
- PAIR 59 correctly routes from RT-11 to RT-16 (not from loop handler to RT-16)

**Validation Method:**
1. End-to-end trace test: a complete operation traverses all 10 loop phases
2. Each phase boundary object is correctly typed (passes schema validation)
3. PAIR 59 wired: RT-11 deliberation triggers RT-16 amendment pipeline receive
4. PAIR 61 wired: RT-16 Step 12 calls `execution-transaction.begin()` through all 6 gates
5. Phase 9→10 loop-back: `constitutional.loop.consequence` triggers RT-08 re-observation
6. Verify (grep): no RT-16 code in `civilization-kernel.js` loop handlers (II-08)

**Rollback Plan:**
1. Revert `civilization-kernel.js` phase annotations and PAIR wiring changes
2. Revert `consensus.js` PAIR 59 wiring
3. Revert `pipeline.js` PAIR 61 confirmation
4. Each change is isolated — revert only the failing component

---

### W3-06 — RT-04: Formal ConstitutionalAuditRecord

| Field | Value |
|-------|-------|
| Task ID | W3-06 |
| Complexity | M |
| Risk | MEDIUM |
| Change Class | Class B |
| IDR Required | Yes — IDR-019 |
| Wave | 3 |
| Enforcement | D6 §3.4 AIR-5 (RT-04 independence — never gated by RT-03) |
| Constitutional Basis | A0-v1.1.1 §3.4; D-4; D6 AIR-5 |

**Objective:** Upgrade the `decision_ledger` table to produce formal `ConstitutionalAuditRecord` objects. Implement `PreservationAuditRecord` interface for RT-16 Class I amendment integration.

**Runtime Affected:** RT-04 (Constitutional Audit Runtime).

**Files Affected:**
- CREATE: `lib/audit/record.js` — ConstitutionalAuditRecord factory
- CREATE: `lib/audit/preservation.js` — PreservationAuditRecord management
- MODIFY: existing decision_ledger interaction code to produce typed ConstitutionalAuditRecord

**Dependencies:** W1-13 (ConstitutionalAuditRecord, PreservationAuditRecord types), W3-01 (RT-16 preservation audit requires W3-01 to be complete for integration).

**Task Steps:**
1. Create `lib/audit/record.js` — wraps `decision_ledger` rows as `ConstitutionalAuditRecord`
2. Create `lib/audit/preservation.js` — `PreservationAuditRecord` management; exposes `requestPreservationAudit(amendmentRef)` called by `lib/amendment/preservation-audit.js`
3. Verify RT-04 independence: audit record production code must NOT be called from within RT-03 gate evaluation (D6 AIR-5)
4. Subscribe `lib/audit/record.js` to `constitutional.coherence.violation` events (from RT-06 W2-10) and produce `ConstitutionalViolationRecord` for each
5. Run `node -e "require('./lib/audit/record')"`

**Constitutional self-check:** D6 AIR-5: no path from RT-03 gate evaluation directly calls RT-04 audit production. Audit is triggered independently (event-driven or after-the-fact), not as a gate dependency.

**Validation Method:**
1. `node -e "require('./lib/audit/record')"` exits 0
2. `node -e "require('./lib/audit/preservation')"` exits 0
3. Verify: no RT-03 gate code calls `lib/audit/record.js` synchronously (audit independence)
4. Integration test with W3-01: `lib/amendment/preservation-audit.js` calls `requestPreservationAudit()` and receives `PreservationAuditRecord`

**Rollback Plan:**
1. Delete `lib/audit/record.js` and `lib/audit/preservation.js`
2. Verify `lib/amendment/preservation-audit.js` is updated to handle absent audit record service

---

### WAVE 3 EXIT GATE (Gate 4)

Execute Gate 4 verification per I2-IMPLEMENTATION-GATE-SPECIFICATION.md before beginning Wave 4.

**Minimum requirements to pass:**
- [ ] GAP-15-001 resolved — 12 domain instances active; `domains.length === 12` assertion passes
- [ ] GAP-16-001 resolved — RT-16 15-step amendment pipeline operational
- [ ] GAP-PIPE-001 resolved — full Constitutional Loop traversable end-to-end
- [ ] All 10 loop phases wired with typed phase-boundary objects
- [ ] PAIR 59 (RT-11 → RT-16) confirmed wired
- [ ] PAIR 61 (RT-16 → RT-03 all 6 gates) confirmed wired
- [ ] RT-16 self-initiation impossible (caller check in pipeline.receive())
- [ ] II-08 verified: no RT-16 code in civilization-kernel.js loop handlers
- [ ] Class I amendment human authorization blocking confirmed
- [ ] Migrations 082, 087, 088 applied
- [ ] `node --check server.js` passes
- [ ] IDRs 014–019 filed and approved
- [ ] Staging validation complete (new Wave 3 implementations required staging verification before Gate 4)

**Gate 4 failure action:** Do not begin Wave 4. Wave 3 contains XL-complexity implementations. If W3-01 (RT-16 pipeline) fails Gate 4 verification, diagnose the specific step failure before retrying.

---

## PART 5 — IDR REGISTER (Wave 0–3)

The following IDRs are required before or during Wave 0–3. Each must be filed in `docs/constitutional-architecture/decisions/` before the corresponding task executes.

| IDR | Required Before | Subject | Change Class |
|-----|----------------|---------|-------------|
| IDR-001 | Gate 0 | Canonical path for constitutional object types (`lib/constitutional-types/` vs `lib/runtime/types/`) | Class B |
| IDR-002 | W2-01 | New `getHistoricalState()` method on `lib/memory/gateway.js` | Class B |
| IDR-003 | W2-02 | PETL Step 2 RT-07 query wiring in `execution-transaction.js` | Class B |
| IDR-004 | W2-03 | ChangeRecord production in `fabric.advanceClaim()` | Class B |
| IDR-005 | W2-04 | Gate 6 addition to `constitutional-gate.js` | Class B |
| IDR-006 | W2-05 | Stage 10 MPW event emission in `execution-transaction.js` | Class B |
| IDR-007 | W2-06 | `lib/knowledge/` creation; `knowledge-validator.js` wrapping | Class B |
| IDR-008 | W2-07 | `lib/decision/compliance-gate.js`; Gate 5 typed CVR validation | Class B |
| IDR-009 | W2-08 | `lib/action/effect-expectation.js`; COMMITTED state wiring | Class B |
| IDR-010 | W2-09 | `lib/reflection/consequence-record.js`; consequence loop-back | Class B |
| IDR-011 | W2-10 | `lib/coherence/gcr-evaluator.js`; GCR-1 through GCR-7 | Class B |
| IDR-012 | W2-11 | SIE CUM wrapping; PAIR 32 wiring | Class B |
| IDR-013 | W2-12 | New route files × 7 | Class B |
| IDR-014 | W3-01 | RT-16 15-step amendment pipeline (XL) | Class B |
| IDR-015 | W3-02 | `lib/observation/boundary.js`; Zone 6 enforcement | Class B |
| IDR-016 | W3-03 | `lib/identity/record.js`; ActorProfile wrapping | Class B |
| IDR-017 | W3-04 | Domain instances 11 and 12 | Class B |
| IDR-018 | W3-05 | Full Constitutional Loop wiring (PAIR 59, PAIR 61) | Class B |
| IDR-019 | W3-06 | RT-04 formal ConstitutionalAuditRecord | Class B |

All IDRs must follow the schema in I2-IMPLEMENTATION-GOVERNANCE-MODEL.md Part 5.2 and be filed in `docs/constitutional-architecture/decisions/IDR-NNN.md` before the task executes.

---

## PART 6 — MIGRATION SEQUENCE SUMMARY

| Migration | Task | Content | Wave |
|-----------|------|---------|------|
| 080 | W2-03 | `change_records`, `historical_anchors` (append-only) | 2 |
| 081 | W2-10 | `coherence_violations`, `domain_coherence_status` | 2 |
| 082 | W3-02 | `observation_records` | 3 |
| 083 | W2-06 | `knowledge_records` | 2 |
| 084 | W2-07 | `compliance_records` | 2 |
| 085 | W2-08 | `effect_expectations` (append-only) | 2 |
| 086 | W2-09 | `consequence_observations` | 2 |
| 087 | W3-01 | `amendments` | 3 |
| 088 | W3-03 | `identity_records` | 3 |
| 089 | W2-01 | `historical_state_records` | 2 |

**Rule:** Migrations must be applied in numerical order. Never skip a migration number. Never modify a migration after it has been applied to any environment.

---

## PART 7 — CONSTITUTIONAL CONSTRAINTS ENFORCED BY THIS PLAN

This wave plan encodes the following constitutional constraints as operational requirements. Violating these is not a task failure — it is a constitutional violation requiring emergency response.

| Constraint | Source | Enforced By |
|-----------|--------|-------------|
| Gate 6 queries RT-05 fabric, NOT RT-07 gateway | C0-MANIFEST §5.2 item 9 | W2-04 task steps; Gate 3 critical failure check |
| RT-04 never gated by RT-03 | D6 §3.4 AIR-5 | W3-06 task steps; audit independence verification |
| RT-16 absent from all 10 loop phases | II-08; C0-MANIFEST §5.2 item 5 | W3-01 self-check; W3-05 verification |
| RT-12 owns CivilizationalDecision (not RT-11) | C0-MANIFEST §5.2 item 4; C0-ERRATA-011A | W1-09 type boundary; W1-10 type ownership |
| RT-16 proposals from RT-11 deliberation only | R16-v1.0; A1-v1.2 §12.8 Step 1 | W3-01 pipeline.receive() caller check |
| Class I amendments require human authorization | D7 §12.2 | W3-01 Step 4 blocking gate |
| RT-15 is twelve-instance runtime | C0-MANIFEST §5.2 item 6 | W3-04 count assertion |
| PETL state machine: PENDING→PREFLIGHT→COMMITTED→EXECUTING→FINALIZED/ABORTED | I1-ARCHITECTURE; I2-MIGRATION LP-1 | W2-02 preservation; W2-08 COMMITTED wiring |
| 6-gate sequence 1→6 strict order | D8 CLI-1 | W2-04 gate position verification |
| EffectExpectationRecord before EXECUTING | I1-ARCHITECTURE INV-7 | W2-08 COMMITTED state constraint |
| KnowledgeRecord traces to ObservationRecord | I1-ARCHITECTURE INV-4 | W2-06 lineage_ref enforcement |
| Amendment pipeline derives from D7 Part 12 | C0-ERRATA-016A | W3-01 IDR-014 constitutional basis |

---

---

## PART 6 — WAVE 1 EXECUTION SEQUENCE (Live, as of 2026-07-25)

This section is the operational execution plan for the remaining Wave 1 tasks. It reflects current completion state, authorization, and the critical path. Update this section as tasks complete.

### Completed Tasks

| Task | Completed | Description |
|------|-----------|-------------|
| W1-01 | 2026-07-25 | Constitutional Types Registry stub (`lib/constitutional-types/index.js`) |
| W1-02 | 2026-07-25 | RT-01 Identity Types (canonical reference implementation, 7 types) |
| W1-02A | 2026-07-25 | Canonical Pattern Remediation — DEF-001 (`_utils.js` extraction) + DEF-002 (collision registry) |

### Authorized — May Begin Immediately (Parallel)

These tasks depend only on W1-01 (COMPLETE) and are fully independent of each other and of W1-06. Any or all may execute simultaneously.

| Task | Runtime | Output File | Type Count |
|------|---------|------------|-----------|
| W1-03 | RT-02 Authority | `authority-certificate.js` | 5 |
| W1-04 | RT-05 Change/Reality Fabric | `change-record.js` | 4 |
| W1-05 | RT-07 Historical State | `historical-state-record.js` | 4 |
| W1-12 | RT-06 Coherence | `coherence-violation-record.js` | 5 |
| W1-13 | RT-03 Kernel + RT-04 Audit | `kernel-record.js` + `audit-record.js` | 5 + 5 |
| W1-14 | RT-15 Domain | `domain-profile.js` | 7 |

### Critical Path — Blocked by IDR-003

All tasks below are blocked, directly or transitively, by IDR-003 OPEN status.

```
IDR-003 OPEN
    │
    ▼ (unblock condition: IDR-003 RESOLVED by Implementation Owner)
W1-06 — RT-08 Observer (5 types in observation-record.js)
    │
    ▼
W1-07 — RT-09 Epistemic (8 types in knowledge-record.js)
    │
    ▼
W1-08 — RT-10 Domain Understanding (3 types in cum.js)
    │
    ▼
W1-09 — RT-11 Civilizational Understanding (7 types in civilizational-decision-proposal.js)
   │ \
   │  ▼
   │ W1-15 — RT-16 Amendment (4 types in amendment-proposal.js)
   │
   ▼
W1-10 — RT-12 Decision (5 types in civilizational-decision.js)
    │
    ▼
W1-11 — RT-13 Projection + RT-14 Consequence
        (effect-expectation-record.js + consequence-observation-record.js, 9 types total)
    │
    ▼
W1-16 — Registry Completion (validates all 14 type files registered; ≥35 types exported)
```

*Note: W1-15 (RT-16 Amendment) depends on W1-09 and may run in parallel with W1-10 once W1-09 is complete.*

### Blocked Tasks

| Task | Directly Blocked By | Unblock Condition |
|------|--------------------|--------------------|
| W1-06 | ~~IDR-003 OPEN~~ | **COMPLETE 2026-07-26** — IDR-003 RESOLVED Option A |
| W1-07 | ~~W1-06~~ | **COMPLETE 2026-07-26** |
| W1-08 | W1-07 | **COMPLETE** 2026-07-26 |
| W1-09 | W1-08 | **COMPLETE** 2026-07-27 |
| W1-10 | W1-09 | W1-09 COMPLETE |
| W1-11 | W1-10 | W1-10 COMPLETE |
| W1-15 | W1-09 | W1-09 COMPLETE |
| W1-16 | All W1-02 through W1-15 | All prior Wave 1 tasks COMPLETE |

### Expected Completion Order

Assuming W1-03/04/05/12/13/14 execute in parallel:

1. **NOW — Parallel batch:** W1-03, W1-04, W1-05, W1-12, W1-13, W1-14
2. **Gate condition:** IDR-003 resolved by Implementation Owner
3. **Sequential critical path:** W1-06 → W1-07 → W1-08 → W1-09
4. **Parallel after W1-09:** W1-10 and W1-15 (independent of each other)
5. **After W1-10:** W1-11
6. **Final:** W1-16 (requires all of 1–5 complete + W1-15 complete)
7. **Wave 1 gate:** Gate 2 verification

### IDR Dependency Summary

| IDR | Status | Blocks |
|-----|--------|--------|
| IDR-001 | APPROVED | Was blocking W1-01 (resolved) |
| IDR-002 | APPROVED | Blocks Wave 2 / W2-03 (not relevant to Wave 1) |
| IDR-003 | **OPEN** | Blocks W1-06 through W1-16 critical path |

---

*End of I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md*
*Document ID: I2-FIRST-WAVE | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
