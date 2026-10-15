# I2 — IMPLEMENTATION GATE SPECIFICATION
## APEX Constitutional Architecture — Implementation Progress Gates

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I2-GATES |
| Phase | I2 — Implementation Control Plane |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | D8 CLI-1–CLI-4; A1-v1.2 §12.1; I1-IMPLEMENTATION-SEQUENCING.md Wave exit gates |
| Authority | I2-IMPLEMENTATION-GOVERNANCE-MODEL.md governs approvals |

**Purpose:** Define formal gates that control the progression of implementation. No implementation wave may begin until its entry gate is passed. No wave is complete until its exit gate is passed. Gate failures halt implementation; they do not cause rollback unless explicitly required.

**Gate authority:** Every gate passage requires Implementation Owner sign-off. Gates are not advisory. A gate that is "mostly met" is not met.

**Gate/Wave relationship:**

```
Gate 0 ──── Wave 0 begins ────► Gate 1
Gate 1 ──── Wave 1 begins ────► Gate 2
Gate 2 ──── Wave 2 begins ────► Gate 3
Gate 3 ──── Wave 3 begins ────► Gate 4
Gate 4 ──── Wave 4 begins ────► Gate 5
Gate 5 ──── Wave 5 begins ────► Gate 6
Gate 6 ──── Certification ────► COMPLETE
```

---

## GATE 0 — CONSTITUTIONAL FREEZE VERIFICATION

**Purpose:** Confirm that the constitutional baseline is frozen, coherent, and sufficient to begin implementation. No implementation code may be written until Gate 0 is passed.

### Entry Criteria

- Implementation Owner has declared intent to begin implementation
- The constitutional corpus is physically accessible in the repository

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| C0-CONSTITUTIONAL-FREEZE-DECLARATION.md exists | `docs/constitutional-architecture/` | File exists and is dated |
| C0-CONSTITUTIONAL-FREEZE-AUDIT.md verdict is PASS | C0-FAA §5.3 | Document reads "CONSTITUTION FROZEN — IMPLEMENTATION AUTHORIZED" |
| All 16 runtime specifications are UNCONDITIONALLY CERTIFIED | C0-MANIFEST §2.1–2.7 | Every row in the manifest shows "UNCONDITIONALLY CERTIFIED" |
| Zero Class I deficiencies across corpus | C0-MANIFEST header | "Class I Deficiencies: 0" |
| Zero Class II deficiencies across corpus | C0-MANIFEST header | "Class II Deficiencies: 0" |
| C0-IMPLEMENTATION-BASELINE-MANIFEST.md identifies all 29 canonical documents | C0-MANIFEST §6 | Count = 29 |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G0-V1 | Constitutional freeze declaration present | File exists at exact path |
| G0-V2 | All 16 runtimes in certification table | Table in C0-MANIFEST §2 has 16 rows, all UNCONDITIONALLY CERTIFIED |
| G0-V3 | No unresolved Class I or Class II | Both counters = 0 in C0-MANIFEST header |
| G0-V4 | A1-v1.2 is operative (not v1.1 or v1.1.1) | C0-MANIFEST §1.2 cites A1-v1.2-canonical.md |
| G0-V5 | D4-v2.0 is operative (not v1.0) | C0-MANIFEST §1.1 cites D4-v2.0-canonical.md |
| G0-V6 | Accepted errata register exists | C0-CONSTITUTIONAL-ERRATA-REGISTER.md exists |
| G0-V7 | I0 documents are complete (baseline audit, gap register, overlap register, roadmap) | Four I0 documents exist in `docs/constitutional-architecture/` |
| G0-V8 | I1 documents are complete (architecture, runtime mapping, migration plan, sequencing) | Four I1 documents exist |
| G0-V9 | I2 documents are complete (this document and its siblings) | Five I2 documents exist |

### Failure Conditions

| Failure | Response |
|---------|----------|
| Any runtime specification is not UNCONDITIONALLY CERTIFIED | Do not begin implementation. Resolve outstanding certification defects. |
| Class I or Class II deficiency unresolved | Implementation is constitutionally unauthorized. Stop. |
| I0 or I1 documents incomplete | Complete missing documents before proceeding. |
| A1 version is not v1.2 | Implementers may be working from wrong interaction architecture. Verify corpus version. |

### Exit Criteria

- [ ] All 9 validation checks pass
- [ ] Implementation Owner has signed the Gate 0 passage record
- [ ] IDR-001 (path conflict resolution: `lib/constitutional-types/` vs `lib/runtime/types/`) is approved

**Gate 0 passage unlocks: Wave 0 (PWA-01, PWA-02)**

---

## GATE 1 — REPOSITORY BASELINE VERIFIED

**Purpose:** Confirm that the current repository state is understood and documented. The implementation team must know what exists before they can safely migrate it.

### Entry Criteria

- Gate 0 passed
- Wave 0 (PWA-01, PWA-02) complete

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| Agent-system/lib boundary document | `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md` or equivalent | File exists with classification of all agent-system/ files |
| `routes/civilisation.js` removed | Repository | `ls routes/civilisation.js` returns not found |
| `routes/civilization.js` retained | Repository | `ls routes/civilization.js` returns found |
| `node --check server.js` passes | Terminal | No syntax errors |
| Migration 079 is the highest applied migration | `migrations/` directory | No migration > 079 applies |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G1-V1 | PWA-01 boundary document exists | File exists and classifies agent-system/ files |
| G1-V2 | Route collision resolved | `routes/civilisation.js` deleted; `server.js` mounts only `civilization.js` |
| G1-V3 | No syntax errors in server | `node --check server.js` exits 0 |
| G1-V4 | I0-IMPLEMENTATION-BASELINE-AUDIT.md exists and covers all modules | Document exists; directory survey complete |
| G1-V5 | I0-IMPLEMENTATION-GAP-REGISTER.md has entries for all CRITICAL gaps | Document lists GAP-03-001, GAP-03-002, GAP-05-001, GAP-07-001, GAP-15-001, GAP-16-001, GAP-16-002 |
| G1-V6 | I0-LEGACY-AND-OVERLAP-REGISTER.md classifies OVL-001 through OVL-031 | Document exists with 31 entries |
| G1-V7 | All Ledger artifacts have EXISTING or AUDITED state | No artifact in Ledger at state below EXISTING |
| G1-V8 | `lib/constitutional-types/` does not yet exist (Wave 1 hasn't started) | Directory absent OR empty stub only |

### Failure Conditions

| Failure | Response |
|---------|----------|
| `routes/civilisation.js` still exists | PWA-02 not complete. Block Wave 1. |
| `node --check server.js` fails | Fix syntax error before proceeding. |
| Boundary document not produced | PWA-01 not complete. Block Wave 1. |
| CRITICAL gaps not documented | I0 gap register incomplete. Complete before Wave 1. |

### Exit Criteria

- [ ] All 8 validation checks pass
- [ ] Implementation Owner signs Gate 1 passage
- [ ] Ledger updated: all artifacts at EXISTING or AUDITED state

**Gate 1 passage unlocks: Wave 1 (Constitutional Object Type Introduction)**

---

## GATE 2 — CORE OBJECT MODEL ESTABLISHED

**Purpose:** Confirm that all constitutional object types are defined as code schemas and registered in the type registry. No runtime wiring begins before the type vocabulary is in place.

### Entry Criteria

- Gate 1 passed
- Wave 1 (W1-01 through W1-16) complete

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| `lib/constitutional-types/index.js` exports ≥ 35 types | Repository | `node -e "const t = require('./lib/constitutional-types'); console.log(Object.keys(t).length)"` prints ≥ 35 |
| All 16 runtime type files present | `lib/constitutional-types/` | 16 type files exist |
| `node --check` passes on all type files | Terminal | Loop `node --check lib/constitutional-types/*.js` all exit 0 |
| No existing test broken | Test suite | Test suite (if present) passes |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G2-V1 | Type registry exports ≥ 35 types | Count confirmed via node -e |
| G2-V2 | IdentityRecord, ActorProfile present | `require('lib/constitutional-types').ActorProfile` not undefined |
| G2-V3 | HistoricalStateQueryResult present | `require('lib/constitutional-types').HistoricalStateQueryResult` not undefined |
| G2-V4 | ChangeRecord, HistoricalAnchor present | Both defined in type registry |
| G2-V5 | CivilizationUnderstandingModel present | Defined in type registry |
| G2-V6 | CivilizationalDecisionProposal present | Defined in type registry |
| G2-V7 | EffectExpectationRecord present | Defined in type registry |
| G2-V8 | ConsequenceObservationRecord present | Defined in type registry |
| G2-V9 | AmendmentProposal, RatifiedAmendmentRecord present | Both defined in type registry |
| G2-V10 | ComplianceVerificationRecord present | Defined in type registry |
| G2-V11 | No existing functionality broken | `node --check server.js` passes; no test regressions |
| G2-V12 | IDR-001 resolved (canonical type path chosen) | IDR-001 filed and approved |

### Failure Conditions

| Failure | Response |
|---------|----------|
| Type count < 35 | Identify missing types; complete W1-N task for that runtime |
| Critical type missing (HSQR, ChangeRecord, CivilizationalDecision) | Block Wave 2 start. These are on the critical path. |
| `node --check` fails on any type file | Fix syntax error before Gate 2 passage |
| Existing test broken | Must be fixed before Gate 2. Wave 1 is additive-only; broken tests indicate a regression. |

### Exit Criteria

- [ ] All 12 validation checks pass
- [ ] Implementation Owner signs Gate 2 passage
- [ ] Ledger updated: all type files at AUDITED or MAPPED state
- [ ] IDR-001 resolved

**Gate 2 passage unlocks: Wave 2 (Constitutional Wiring)**

---

## GATE 3 — AUTHORITY AND GOVERNANCE ENFORCEMENT ACTIVE

**Purpose:** Confirm that the three critical constitutional enforcement systems are operational before the broader runtime wiring begins: RT-03 PETL Step 2 (historical contextualization), Gate 6 (temporal integrity), and Stage 10 MPW (coherence trigger). These are the highest-risk Wave 2 changes.

### Entry Criteria

- Gate 2 passed
- Wave 2 critical path tasks complete: W2-01, W2-02, W2-03, W2-04, W2-05

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| GAP-03-001 resolved | `execution-transaction.js` | `ctx.historical_context_id` present in test transaction context |
| GAP-03-002 resolved | `constitutional-gate.js` | Gate 6 function exists; test: Gate 6 blocks on stale ChangeRecord |
| GAP-05-001 resolved | `fabric.js` | `change_records` table exists; advanceClaim() test produces a row |
| GAP-07-001 resolved | `gateway.js` | `getHistoricalState()` method exists; returns HistoricalStateQueryResult |
| GAP-03-003 resolved | `execution-transaction.js` | `constitutional.stage10.mpw` event emitted after FINALIZED |
| Migration 080 applied | Database | `change_records` and `historical_anchors` tables exist |
| Gate sequence verified | `constitutional-gate.js` | Code inspection confirms gates execute 1→2→3→4→5→6 in sequence |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G3-V1 | `getHistoricalState()` on gateway.js | Method exists; returns typed HistoricalStateQueryResult |
| G3-V2 | PETL Step 2 wired | integration test: PETL context includes `historical_context_id` |
| G3-V3 | ChangeRecord produced on advanceClaim() | DB test: `change_records` gets row after advanceClaim() |
| G3-V4 | Gate 6 calls getChangeHistory() not getHistoricalState() | Code inspection: Gate 6 calls `fabric.getChangeHistory()` (C0-MANIFEST §5.2 item 9) |
| G3-V5 | Gate 6 blocks on stale object | Unit test: Gate 6 DENY when ChangeRecord timestamp fails temporal validity |
| G3-V6 | Gate sequence is 1→6 strict order | Code inspection: no gate reordering; CLI-1 compliant |
| G3-V7 | Stage 10 MPW signal emitted | Integration test: `constitutional.stage10.mpw` event fired after FINALIZED |
| G3-V8 | PETL 5-state machine unchanged | Code inspection: PENDING/PREFLIGHT/COMMITTED/EXECUTING/FINALIZED/ABORTED all present |
| G3-V9 | RT-04 not called from PETL preflight | Code inspection: no `decision_ledger` call in preflight stages (II-09, AIR-5) |
| G3-V10 | `node --check server.js` passes | Terminal: exit 0 |
| G3-V11 | No production functionality broken | Manual smoke test: basic request/response cycle works |

### Failure Conditions

| Failure | Response |
|---------|----------|
| Gate 6 queries gateway.js (RT-07) instead of fabric.js (RT-05) | Constitutional violation of C0-MANIFEST §5.2 item 9. Block Gate 3. Fix gate source immediately. |
| PETL 5-state machine modified | Potential constitutional preservation violation. Halt. Review against I1-ARCHITECTURE Part 18. |
| RT-04 called from preflight | AIR-5 violation. Block Gate 3. |
| Gate sequence is not 1→6 | CLI-1 violation. Block Gate 3. |
| Production requests failing | Halt Wave 2. Rollback task(s) causing the failure. |

### Exit Criteria

- [ ] All 11 validation checks pass
- [ ] CRITICAL gaps GAP-03-001, GAP-03-002, GAP-05-001, GAP-07-001 all confirmed resolved
- [ ] Implementation Owner signs Gate 3 passage
- [ ] Ledger: RT-03, RT-05, RT-07 artifacts at MIGRATED state

**Gate 3 passage unlocks: Wave 3 (Missing Runtime Implementation)**

---

## GATE 4 — RUNTIME WIRING BEGINS

**Purpose:** Confirm that all Wave 2 constitutional wiring is complete before the larger Wave 3 tasks (RT-16 pipeline, Observation Boundary) begin. Wave 3 builds on Wave 2; incomplete Wave 2 wiring under Wave 3 creates hidden dependencies.

### Entry Criteria

- Gate 3 passed
- All Wave 2 tasks complete: W2-01 through W2-12

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| Migrations 080–086, 088, 089 all applied | Database | All tables exist: change_records, coherence_violation_records, observation_records, knowledge_records, compliance_verification_records, effect_expectations, consequence_observations, identity_records, historical_state_records |
| RT-06 GCR evaluator active | `lib/coherence/gcr-evaluator.js` | File exists; GCR-1 through GCR-7 functions present |
| RT-09 knowledge pipeline active | `lib/knowledge/` | record.js and evidence-pipeline.js exist |
| RT-12 compliance gate active | `lib/decision/compliance-gate.js` | File exists; returns ComplianceVerificationRecord |
| RT-13 EffectExpectationRecord at COMMITTED | `execution-transaction.js` | Code produces EffectExpectationRecord at COMMITTED→EXECUTING transition |
| RT-14 ConsequenceObservationRecord produced | `lib/reflection/consequence-record.js` | File exists; ObservedConsequenceRecord produced after FINALIZED |
| CUM type wrapping SIE output | `lib/intelligence/sie.js` | SIE output is CivilizationUnderstandingModel type |
| New Wave 2 routes mounted | `server.js` | identity.js, authority.js, coherence.js, knowledge.js, decisions.js, actions.js, reflection.js all mounted |
| No MODULE_NOT_FOUND errors | `node -e "require('./server')"` | All new requires resolve |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G4-V1 | All 9 new migrations applied | All tables queryable in DB |
| G4-V2 | GCR evaluator has 7 named checks | Code inspection: GCR-1 through GCR-7 identifiable functions |
| G4-V3 | KnowledgeRecord lineage traces to ObservationRecord | Code inspection: `lineage_ref` field present in KnowledgeRecord (INV-4) |
| G4-V4 | ComplianceVerificationRecord has COMPLIANT/NON_COMPLIANT verdict | Type schema has verdict field; compliance-gate.js returns it |
| G4-V5 | EffectExpectationRecord produced before EXECUTING state | Code inspection: production at COMMITTED state, not EXECUTING |
| G4-V6 | INV-6 enforcement exists | `outcome-registry.js` or `consequence-record.js` tracks outstanding EERs |
| G4-V7 | SIE wrapped as CUM type | `sie.js` returns CivilizationUnderstandingModel; `constitutional.loop.understanding` event emitted |
| G4-V8 | Stage 10 MPW → RT-06 wired | Integration test: coherence.violation table gets row after committed operation |
| G4-V9 | All new routes use internal sub-prefix | Code inspection per CLAUDE.md rule |
| G4-V10 | `node --check server.js` passes | exit 0 |
| G4-V11 | No production regression | Smoke test: existing chat, memory, and governance endpoints functional |
| G4-V12 | RT-16 code absent from loop handlers | Code inspection: no `amendment` or `lib/amendment` require in civilization-kernel.js (II-08) |

### Failure Conditions

| Failure | Response |
|---------|----------|
| EffectExpectationRecord produced after EXECUTING (not at COMMITTED) | INV-7 violation. Block Gate 4. Fix transition timing. |
| RT-16 code in civilization-kernel.js | II-08 violation. Block Gate 4. Remove immediately. |
| Any migration missing | Database schema incomplete. Apply missing migration before proceeding. |
| MODULE_NOT_FOUND on require | New `require()` not verified before commit. Fix require path. |

### Exit Criteria

- [ ] All 12 validation checks pass
- [ ] All Wave 2 CRITICAL and HIGH gaps confirmed resolved
- [ ] Implementation Owner signs Gate 4 passage
- [ ] Ledger: RT-06, RT-09, RT-12, RT-13, RT-14 at MIGRATED state

**Gate 4 passage unlocks: Wave 4 (Legacy Remediation)**

---

## GATE 5 — RUNTIME CERTIFICATION TESTS PASSING

**Purpose:** Confirm that all 16 runtimes pass their constitutional certification tests before legacy removal is authorized. This gate is the highest evidence bar in the implementation process.

### Entry Criteria

- Gate 4 passed
- Wave 3 complete: W3-01 (RT-16 pipeline), W3-02 (Observation Boundary), W3-03 (RT-01 identity), W3-04 (RT-15 domains), W3-05 (full loop wiring), W3-06 (RT-04 formal AuditRecord)

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| RT-16 pipeline complete | `lib/amendment/pipeline.js` | 15 named steps in implementation |
| PAIR 59 wired | `civilisation/consensus.js` → `lib/amendment/pipeline.js` | Code trace from deliberation to amendment receive |
| PAIR 61 wired | `lib/amendment/pipeline.js` → `execution-transaction.js` | Amendment commit routes through PETL |
| 12 domain instances active | `civilisation/domain-loader.js` | domains.length === 12 at startup |
| RT-01 lib/identity/ active | `lib/identity/record.js` | File exists; returns ActorProfile |
| Observation Boundary (Zone 6) active | `lib/observation/boundary.js` | File exists; blocks non-ObservationRecord inputs |
| Full loop trace completable | Integration test | Phases 1–10 each produce their constitutional object type |
| Migration 087 applied | Database | `amendments` table exists |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G5-V1 | RT-16 pipeline has 15 steps | Code inspection matches A1-v1.2 §12.8 step count |
| G5-V2 | RT-16 self-initiation blocked | Unit test: `pipeline.receive()` called without RT-11 deliberation ref → error |
| G5-V3 | Class I amendment blocks for human auth | Unit test: Class I proposal stalls at Step 4 without human actor |
| G5-V4 | PreservationAuditRecord produced for Class I | Integration test: RT-04 receives PreservationAuditRecord before Class I commit |
| G5-V5 | domains.length === 12 at startup | Boot log or test |
| G5-V6 | DOM-000001 initializes first | Code inspection: domain-loader.js order |
| G5-V7 | Observation Boundary enforced (II-06) | Integration test: external data without ObservationRecord blocked before RT-09 |
| G5-V8 | Loop trace Phase 1→10 completable | Integration test: each phase boundary produces the correct constitutional type |
| G5-V9 | All 6 gates fire in sequence | Integration test: Gate 1→2→3→4→5→6 sequence verified for a sample operation |
| G5-V10 | INV-6 enforced (every action has COR) | Test: outstanding EffectExpectationRecord without COR flagged |
| G5-V11 | INV-4 enforced (KnowledgeRecord traces to ObservationRecord) | Test: KnowledgeRecord without lineage_ref rejected |
| G5-V12 | RT-16 absent from all loop phases | Code inspection: civilization-kernel.js has no RT-16 code (II-08) |
| G5-V13 | Amendment commit passes all 6 gates | Integration test: amendment process routes through constitutional-gate.js all 6 gates |
| G5-V14 | GAP-PIPE-001 resolved | End-to-end test: full Constitutional Loop wired |
| G5-V15 | `node --check server.js` passes | exit 0 |

### Failure Conditions

| Failure | Response |
|---------|----------|
| RT-16 self-initiates without RT-11 | PROH-3 violation and A1 §14.3 violation. Block Gate 5. Fix pipeline entry guard. |
| Class I amendment automated without human auth | D7 §12.2 violation and D8 INV violation. Block Gate 5. Fix pipeline Step 4 gate. |
| Loop trace fails at any phase | Constitutional Loop not fully wired (GAP-PIPE-001 not resolved). Block Gate 5. |
| KnowledgeRecord without lineage accepted | INV-4 violation. Block Gate 5. |
| domains.length !== 12 | GAP-15-001 not resolved. Block Gate 5. |

### Exit Criteria

- [ ] All 15 validation checks pass
- [ ] All CRITICAL and HIGH gaps from I0-IMPLEMENTATION-GAP-REGISTER.md confirmed resolved
- [ ] Implementation Owner signs Gate 5 passage
- [ ] Wave 5 errata checks complete: I0 gap register reviewed against actual codebase; all CRITICAL gaps closed

**Gate 5 passage unlocks: Wave 5 (Verification and Legacy Retirement Authorization)**

---

## GATE 6 — LEGACY RETIREMENT AUTHORIZATION

**Purpose:** Confirm that the legacy remediation wave is complete and authorize the removal of superseded artifacts. This is the terminal gate; passing it means the repository is constitutionally compliant and clean.

### Entry Criteria

- Gate 5 passed
- Wave 4 complete: W4-01 (lib/cognitive/ merged), W4-02 (routes deduplicated), W4-03 (agent-system assessment)
- Wave 5 complete: W5-01 (errata), W5-02 (end-to-end verification), W5-03 (verification report)

### Required Evidence

| Evidence Item | Source | Verification |
|---------------|--------|-------------|
| OVL-009 resolved | `lib/cognitive/` deleted | `ls lib/cognitive/` returns not found |
| Route deduplication complete | `routes/` | `reality-architecture.js` and `intelligence-memory.js` deleted |
| Agent-system assessment report | `docs/constitutional-architecture/I1-AGENT-SYSTEM-ASSESSMENT.md` | File exists |
| I1 verification report | `docs/constitutional-architecture/I1-VERIFICATION-REPORT.md` | File exists with constitutional compliance state |
| All CRITICAL and HIGH gaps resolved | I0 gap register + verification report | Verification report confirms all CRITICAL + HIGH gaps closed |
| No active OVL-N items unresolved | Verification report | All OVL items at RESOLVED state or DEFERRED with justification |

### Validation Checks

| Check ID | Description | Pass Condition |
|----------|-------------|----------------|
| G6-V1 | OVL-001 resolved (Wave 0) | `routes/civilisation.js` absent |
| G6-V2 | OVL-009 resolved (Wave 4) | `lib/cognitive/` absent |
| G6-V3 | No duplicate sources of truth for any RT | Ledger: no CONFLICT states active |
| G6-V4 | All TCLs removed or have documented removal conditions | Ledger: no TCL without removal condition |
| G6-V5 | All REMOVED artifacts have zero-reference audits | Ledger: REMOVED artifacts all have caller audit sign-off |
| G6-V6 | Constitutionally-preserved artifacts unchanged | Code inspection against I1-ARCHITECTURE Part 18 checklist |
| G6-V7 | Append-only tables have no DELETE operations in any migration | Migration audit: no DELETE in change_records, amendments, historical_state_records migrations |
| G6-V8 | I1 verification report produced | File exists with compliance assessment |
| G6-V9 | `node --check server.js` passes | exit 0 |
| G6-V10 | Full end-to-end test passes | W5-02 verification checklist fully satisfied |

### Failure Conditions

| Failure | Response |
|---------|----------|
| CONFLICT state in Ledger | Dual-source-of-truth exists. Resolve before Gate 6. |
| Constitutionally-preserved artifact modified | Immediate investigation. If constitutional behavior changed, this may require RT-16. |
| REMOVED artifact still referenced in code | Caller audit was wrong or incomplete. Re-audit. Do not gate-pass. |
| Append-only table has DELETE in migration | Constitutional data destruction. CRITICAL violation. Halt. |

### Exit Criteria

- [ ] All 10 validation checks pass
- [ ] Implementation Owner signs Gate 6 passage
- [ ] I1 verification report filed
- [ ] Ledger: all artifacts at VERIFIED, DEPRECATED, or REMOVED state (none at EXISTING, AUDITED, or MAPPED)

**Gate 6 passage: IMPLEMENTATION COMPLETE. System is constitutionally compliant with APEX-CONSTITUTION-v1.0.**

---

## GATE SUMMARY TABLE

| Gate | Name | Unlocks | Critical Check |
|------|------|---------|----------------|
| Gate 0 | Constitutional Freeze Verification | Wave 0 | All 16 runtimes UNCONDITIONALLY CERTIFIED |
| Gate 1 | Repository Baseline Verified | Wave 1 | Route collision resolved; boundary doc exists |
| Gate 2 | Core Object Model Established | Wave 2 | ≥35 constitutional types exported; IDR-001 approved |
| Gate 3 | Authority/Governance Enforcement Active | Wave 3 | GAP-03-001/002, GAP-05-001, GAP-07-001 resolved; Gate 6 NOT querying RT-07 |
| Gate 4 | Runtime Wiring Complete | Wave 4 | All Wave 2 migrations applied; RT-16 absent from loop; EER at COMMITTED |
| Gate 5 | Runtime Certification Tests Passing | Wave 5 | Full loop trace; RT-16 non-self-initiating; 12 domains; loop wired |
| Gate 6 | Legacy Retirement Authorized | COMPLETE | No CONFLICT states; preserved artifacts unchanged; report filed |

---

*End of I2-IMPLEMENTATION-GATE-SPECIFICATION.md*
*Document ID: I2-GATES | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
