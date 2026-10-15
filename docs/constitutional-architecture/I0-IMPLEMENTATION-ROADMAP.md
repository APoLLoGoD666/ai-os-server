# I0 — IMPLEMENTATION ROADMAP
## APEX Constitutional Architecture — Phased Implementation Plan

---

## ROADMAP IDENTIFICATION

| Field | Value |
|-------|-------|
| Roadmap ID | I0-ROADMAP |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Audit Date | 2026-07-25 |
| Basis Documents | I0-IMPLEMENTATION-BASELINE-AUDIT.md, I0-RUNTIME-IMPLEMENTATION-MATRIX.md, I0-IMPLEMENTATION-GAP-REGISTER.md, I0-LEGACY-AND-OVERLAP-REGISTER.md |
| Constitutional Reference | C0-IMPLEMENTATION-BASELINE-MANIFEST.md |

**Purpose:** This roadmap allows another engineer to implement the entire APEX system against the frozen constitutional baseline without rereading the constitutional documents. It converts gap analysis into an ordered sequence of waves, each scoped to a specific constitutional objective, with explicit dependencies, affected files, required deliverables, and risks.

---

## READING THIS DOCUMENT

Each wave entry uses the following structure:

- **Objective** — The constitutional goal this wave achieves
- **Constitutional Authorization** — Which canonical documents authorize this work
- **Pre-conditions** — What must be complete before this wave begins
- **Gap IDs Addressed** — References to I0-IMPLEMENTATION-GAP-REGISTER.md
- **Overlap IDs Addressed** — References to I0-LEGACY-AND-OVERLAP-REGISTER.md
- **Repository Scope** — Exact files and directories to modify or create
- **Required Deliverables** — What must exist when the wave is complete
- **Risks** — Known failure modes and mitigations
- **Completion Criterion** — Verifiable test that the wave is done

---

## PRE-WAVE: ARCHITECTURAL BOUNDARY DECLARATION

**This must be done before any wave begins.**

### PWA-01 — Define the agent-system / lib Boundary

| Field | Value |
|-------|-------|
| Addresses | OVL-019 |
| Output | A boundary declaration document (not code) |
| Effort | Small |

The `agent-system/` directory (~50 files, ~700K) and the `lib/` directory (~180+ files) coexist without a documented constitutional boundary. This ambiguity makes it impossible to safely introduce constitutional object types without risking dual implementation.

**Action required:**

Produce `docs/runtime/AGENT-SYSTEM-BOUNDARY.md` declaring:
1. Which `agent-system/` files are the **authoritative** implementation of each constitutional runtime (if any)
2. Which `agent-system/` files are **superseded** by corresponding `lib/` implementations
3. Which `agent-system/` files are **non-constitutional** (external adapters, tools, utility bridges) with no RT assignment
4. Which `agent-system/` files are **pending migration** to `lib/`

Until this document exists, all wave implementations must assume `lib/` is authoritative and `agent-system/` is legacy.

---

### PWA-02 — Resolve Route Collision

| Field | Value |
|-------|-------|
| Addresses | OVL-001 |
| Output | One of the two civilization route files removed or merged |
| Effort | Small |

Resolve `routes/civilisation.js` vs `routes/civilization.js` before any RT-11/RT-15 wiring begins. Confirm which file is mounted in `server.js` and under which path. If both are mounted, determine whether their endpoint paths collide.

**Action required:**

1. Inspect `server.js` for route mounting of both files
2. If `civilisation.js` endpoints are a strict subset of `civilization.js`, delete `civilisation.js`
3. If `civilisation.js` has unique endpoints, merge them into `civilization.js` first
4. Confirm only `civilization.js` remains

---

## WAVE 1 — CONSTITUTIONAL OBJECT TYPE INTRODUCTION

**Objective:** Introduce the constitutional object types (IdentityRecord, ObservationRecord, KnowledgeRecord, CUM, etc.) as named data structures. No behavioral changes. No route changes. This wave makes the constitutional vocabulary available to the codebase.

**Constitutional Authorization:** R1-v1.1, R2-v1.0, R5-v1.0, R8-v1.1, R9-v1.0, R10-v1.1, R11-v1.3, R12-v1.0, R13-v1.0, R14-v1.0 (RS-09 through RS-14 of each, which define object schemas)

**Pre-conditions:** PWA-01 and PWA-02 complete.

**Duration estimate:** Medium (2–3 weeks)

---

### W1-01 — RT-01 IdentityRecord and IdentityManifest

| Gap IDs | GAP-01-001, GAP-01-002 |
|---------|------------------------|
| Files | New: `lib/runtime/types/identity-record.js`, New: `lib/runtime/types/identity-manifest.js` |
| Database | `migrations/037_kernel_identity_tables.sql` (existing `agents` table is the backing store) |

**Deliverables:**
- `IdentityRecord` type: `{record_id, agent_id, identity_class, authority_tier, birth_vector, active_state, cryptographic_anchor}`
- `IdentityManifest` type: `{manifest_id, identity_record_ref, capability_vector, constraint_vector, authority_assignments}`
- Both types must have `toJSON()` and `validate()` methods
- Unit test verifying field completeness

**Risk:** Existing `agents` table columns may not map cleanly to constitutional field names. Do not rename columns — add a translation layer in the type constructor.

**Completion criterion:** `require('./lib/runtime/types/identity-record')` succeeds; `new IdentityRecord({...}).validate()` returns true for a valid agent row.

---

### W1-02 — RT-02 Authority Type Declarations (AIR-1 through AIR-5)

| Gap IDs | GAP-02-001, GAP-02-002 |
|---------|------------------------|
| Files | New: `lib/runtime/types/authority-record.js` |
| Constitutional source | D6 §4.2–4.6 (five authority types); D6 §4.7 (Authority Integrity Rules) |

**Deliverables:**
- `AuthorityRecord` type with five authority type constants: `FOUNDING`, `COUNCIL`, `SYSTEM`, `AGENT`, `DELEGATED`
- Authority integrity check: `validateAuthorityChain(record)` returning VALID/INVALID/UNRESOLVABLE
- Constants file: `lib/runtime/types/authority-constants.js` (AIR-1 through AIR-5, AIR-N integrity rules)

**Risk:** D6 §4.7 AIR-N (Authority Integrity Rules) are distinct from §4.2–4.6 AIR-N (authority types). Do not conflate. C0-MANIFEST §5.2 item 7 documents this risk explicitly.

**Completion criterion:** Importing the authority record module exports exactly five named authority type constants; `validateAuthorityChain` rejects a chain with a self-referential delegation loop.

---

### W1-03 — RT-05 ChangeRecord and HistoricalAnchor

| Gap IDs | GAP-05-001 |
|---------|------------|
| Files | New: `lib/runtime/types/change-record.js`, New: `lib/runtime/types/historical-anchor.js` |
| Database | `migrations/066_reality_fabric.sql` (`reality_claims` table is the backing store) |
| Constitutional note | C0-MANIFEST §5.2 item 9: Gate 6 uses RT-05 ChangeRecord/HistoricalAnchor history (not RT-07 temporal record) |

**Deliverables:**
- `ChangeRecord` type: `{change_id, claim_ref, stage_from, stage_to, transition_vector, timestamp, actor_ref}`
- `HistoricalAnchor` type: `{anchor_id, claim_ref, historical_state_hash, anchor_timestamp, authority_ref}`
- Both types must serialize to/from `reality_claims` and `claim_lifecycle_events` rows

**Risk:** Gate 6 (`lib/runtime/constitutional-gate.js`) currently does not reference ChangeRecord/HistoricalAnchor. Wiring Gate 6 to use these types is Wave 2 work (W2-05). This wave only introduces the types.

**Completion criterion:** Both types constructable and serializable without errors.

---

### W1-04 — RT-07 HistoricalStateRecord and HistoricalStateQueryResult

| Gap IDs | GAP-07-001 |
|---------|------------|
| Files | New: `lib/runtime/types/historical-state-record.js`, New: `lib/runtime/types/historical-state-query-result.js` |
| Database | `lib/memory/gateway.js` assembles layers 0–11; backing store is existing memory tables |

**Deliverables:**
- `HistoricalStateRecord` type wrapping a temporal memory snapshot
- `HistoricalStateQueryResult` type wrapping query results from temporal memory
- Both must be emittable from `lib/memory/gateway.js` on `getContext()` calls

**Risk:** `getContext()` returns a large assembled object. Adding type wrappers must not break existing callers. Introduce as optional wrapper (callers opt into the typed form).

**Completion criterion:** `lib/memory/gateway.js` can be invoked with a `{typed: true}` option returning a `HistoricalStateQueryResult`.

---

### W1-05 — RT-08 ObservationRecord

| Gap IDs | GAP-08-001, GAP-08-003 |
|---------|------------------------|
| Files | New: `lib/runtime/types/observation-record.js` |
| Database | `migrations/067_observer_infrastructure.sql` (`observer_registry`, `calibration_events` tables) |

**Deliverables:**
- `ObservationRecord` type: `{record_id, sensor_ref, observation_vector, confidence_score, timestamp, observation_boundary_ref}`
- Factory function: `fromSensorReading(sensor, reading)` producing a constitutional `ObservationRecord`

**Completion criterion:** `ObservationRecord.fromSensorReading(sensor, reading)` produces a valid record with all required fields.

---

### W1-06 — RT-09 KnowledgeRecord

| Gap IDs | GAP-09-001 |
|---------|------------|
| Files | New: `lib/runtime/types/knowledge-record.js` |
| Database | `migrations/068_understanding_layer.sql` (`understanding_scores` table) |

**Deliverables:**
- `KnowledgeRecord` type: `{record_id, domain_ref, claim_ref, certainty_score, evidence_vector, knowledge_class, lifecycle_state}`
- `lifecycle_state` must be one of: PROVISIONAL, VALIDATED, INTEGRATED, DEPRECATED

**Completion criterion:** `KnowledgeRecord` constructable; `lifecycle_state` validation rejects unknown states.

---

### W1-07 — RT-10 Cognitive Unified Model (CUM)

| Gap IDs | GAP-10-001 |
|---------|------------|
| Files | New: `lib/runtime/types/cognitive-unified-model.js` |
| Existing | `lib/intelligence/sie.js` (44.6K) is the backing implementation |

**Deliverables:**
- `CUM` type: `{model_id, priority_vector, reality_state_ref, knowledge_state_ref, decision_context_ref, synthesis_timestamp}`
- `fromSIEState(sieOutput)` factory function that wraps a SIE analysis output in a constitutional CUM

**Risk:** SIE output structure is large and complex. The CUM wrapper must not copy the entire SIE output — it should hold references and expose the constitutional fields only.

**Completion criterion:** `CUM.fromSIEState(sieOutput).validate()` returns true for a standard SIE analysis output.

---

### W1-08 — RT-11 CivilizationalDecisionProposal

| Gap IDs | GAP-11-001 |
|---------|------------|
| Files | New: `lib/runtime/types/civilizational-decision-proposal.js` |
| Existing | `civilisation/consensus.js` generates consensus proposals |
| Constitutional note | C0-MANIFEST §5.2 item 4: RT-11 owns CivilizationalDecisionProposal (not RT-12) |

**Deliverables:**
- `CivilizationalDecisionProposal` type: `{proposal_id, session_type, proposing_domain_ref, quorum_requirement, evidence_vector, proposal_state}`
- `proposal_state` must be one of: PENDING, APPROVED, REJECTED, EXPIRED (matching `civilisation/consensus.js` session states)

**Completion criterion:** `CivilizationalDecisionProposal` constructable from a `civilisation/consensus.js` session object.

---

### W1-09 — RT-12 CivilizationalDecision

| Gap IDs | GAP-12-001 |
|---------|------------|
| Files | New: `lib/runtime/types/civilizational-decision.js` |
| Existing | `lib/runtime/decision-lattice.js` produces decision objects |
| Constitutional note | C0-MANIFEST §5.2 item 4: RT-12 owns CivilizationalDecision (not RT-11) |

**Deliverables:**
- `CivilizationalDecision` type: `{decision_id, proposal_ref, decision_vector, rationale_vector, authority_ref, decision_timestamp}`
- `fromLatticeOutput(latticeResult)` factory function

**Completion criterion:** `CivilizationalDecision.fromLatticeOutput(latticeResult).validate()` passes.

---

### W1-10 — RT-13 EffectExpectationRecord

| Gap IDs | GAP-13-001 |
|---------|------------|
| Files | New: `lib/runtime/types/effect-expectation-record.js` |
| Existing | `lib/runtime/execution-transaction.js` PETL state machine; `lib/runtime/governance-contract.js` |

**Deliverables:**
- `EffectExpectationRecord` type: `{record_id, transaction_ref, expected_effects_vector, authority_basis_ref, pre_execution_timestamp}`
- Must be producible at PETL COMMITTED state before EXECUTING begins

**Completion criterion:** `EffectExpectationRecord` constructable at COMMITTED state; `validate()` requires non-null `transaction_ref` in COMMITTED state.

---

### W1-11 — RT-14 ConsequenceObservationRecord

| Gap IDs | GAP-14-001 |
|---------|------------|
| Files | New: `lib/runtime/types/consequence-observation-record.js` |
| Existing | `lib/runtime/outcome-registry.js` (12.2K) |

**Deliverables:**
- `ConsequenceObservationRecord` type: `{record_id, action_ref, expected_effects_ref, observed_effects_vector, divergence_score, reflection_timestamp}`
- Must be producible from an `outcome-registry.js` outcome record

**Completion criterion:** `ConsequenceObservationRecord` constructable from an outcome-registry record; `divergence_score` computed as numeric 0.0–1.0.

---

### W1-12 — RT-06 CoherenceViolationRecord

| Gap IDs | GAP-06-002 |
|---------|------------|
| Files | New: `lib/runtime/types/coherence-violation-record.js` |
| Existing | `lib/constitution/spec.js` `verify()` returns violation information |

**Deliverables:**
- `CoherenceViolationRecord` type: `{violation_id, check_ref, violated_principle_ref, violation_class, severity, resolution_state}`
- `resolution_state` must be one of: OPEN, ACKNOWLEDGED, RESOLVING, RESOLVED

**Completion criterion:** `CoherenceViolationRecord` constructable from a `spec.js` verify() failure result.

---

## WAVE 2 — CONSTITUTIONAL WIRING (EXISTING SYSTEMS)

**Objective:** Wire existing implementations to emit and consume constitutional object types. No new behavioral logic. The existing logic stays; it just now produces constitutional types at its outputs.

**Pre-conditions:** All Wave 1 deliverables complete (W1-01 through W1-12).

**Duration estimate:** Large (4–6 weeks)

---

### W2-01 — Wire RT-01 Identity Lifecycle Into agents Table

| Gap IDs | GAP-01-003 |
|---------|------------|
| Files | `lib/runtime/types/identity-record.js`, `migrations/037_kernel_identity_tables.sql`, any code creating agent rows |

Create an `IdentityRecord.create(agentSpec)` method that writes through to the `agents` table. Ensure the FOUNDED state transition is recorded.

**Completion criterion:** Creating a new agent via API produces a row in `agents` that can be loaded as a valid `IdentityRecord`.

---

### W2-02 — Wire RT-05 ChangeRecord Emission into reality/fabric.js

| Gap IDs | GAP-05-001 |
|---------|------------|
| Files | `lib/reality/fabric.js`, `lib/runtime/types/change-record.js` |

Modify `advanceClaim()` in `lib/reality/fabric.js` to produce a `ChangeRecord` at every stage transition. Store in `claim_lifecycle_events`.

**Completion criterion:** Every call to `advanceClaim()` produces a `ChangeRecord` that can be retrieved by `claim_id`.

---

### W2-03 — Wire RT-07 HistoricalStateRecord Emission into memory/gateway.js

| Gap IDs | GAP-07-001 |
|---------|------------|
| Files | `lib/memory/gateway.js`, `lib/runtime/types/historical-state-record.js` |

Add a `getHistoricalState(timestamp)` method to `gateway.js` that returns a `HistoricalStateRecord`.

**Completion criterion:** `gateway.getHistoricalState(T)` returns a record with the constitutional type structure.

---

### W2-04 — Wire RT-08 ObservationRecord Emission into observer-health/index.js

| Gap IDs | GAP-08-001, GAP-08-003 |
|---------|------------------------|
| Files | `lib/observer-health/index.js`, `lib/runtime/types/observation-record.js` |

Modify `recordCalibration()` and `registerSensor()` to produce `ObservationRecord` instances stored in the observation log.

**Completion criterion:** Every sensor calibration event produces a `ObservationRecord` with all required fields.

---

### W2-05 — Wire Gate 6 to RT-05 ChangeRecord History

| Gap IDs | GAP-03-002, GAP-05-001 |
|---------|------------------------|
| Files | `lib/runtime/constitutional-gate.js`, `lib/reality/fabric.js`, `lib/runtime/types/change-record.js` |
| Constitutional note | C0-MANIFEST §5.2 item 9: Gate 6 uses RT-05 ChangeRecord/HistoricalAnchor history |

Gate 6 (Modification Gate) must query `ChangeRecord` history for the claim being evaluated. This gate currently exists but reads from wrong sources. Rewire it to call `fabric.getChangeHistory(claim_id)` returning `ChangeRecord[]`.

**Completion criterion:** Gate 6 evaluation logs a reference to `ChangeRecord[]` in its verdict record.

---

### W2-06 — Wire PETL Step 3 (CUM Validation) into execution-transaction.js

| Gap IDs | GAP-03-001 |
|---------|------------|
| Files | `lib/runtime/execution-transaction.js`, `lib/runtime/types/cognitive-unified-model.js`, `lib/intelligence/sie.js` |

PETL Step 3 (PREFLIGHT stage: Cognitive State Consistency) requires a CUM snapshot before execution. Add a PREFLIGHT check that calls SIE, wraps the output in a `CUM`, and validates it before advancing to COMMITTED.

**Completion criterion:** A transaction in PREFLIGHT state that fails CUM validation is rejected with `PREFLIGHT_FAILED` and does not advance to COMMITTED.

---

### W2-07 — Wire RT-11 CivilizationalDecisionProposal into consensus.js

| Gap IDs | GAP-11-001 |
|---------|------------|
| Files | `civilisation/consensus.js`, `lib/runtime/types/civilizational-decision-proposal.js` |

Modify `civilisation/consensus.js` session creation to produce a `CivilizationalDecisionProposal` as its primary output type.

**Completion criterion:** Creating a consensus session returns a `CivilizationalDecisionProposal` with all required fields.

---

### W2-08 — Wire RT-12 CivilizationalDecision into decision-lattice.js

| Gap IDs | GAP-12-001 |
|---------|------------|
| Files | `lib/runtime/decision-lattice.js`, `lib/runtime/types/civilizational-decision.js` |

Modify `decision-lattice.js` to wrap its output in a `CivilizationalDecision` before returning.

**Completion criterion:** `decision-lattice.js` output is a `CivilizationalDecision` with all required fields.

---

### W2-09 — Wire RT-13 EffectExpectationRecord at PETL COMMITTED state

| Gap IDs | GAP-13-001 |
|---------|------------|
| Files | `lib/runtime/execution-transaction.js`, `lib/runtime/types/effect-expectation-record.js` |

Modify the COMMITTED state transition in `execution-transaction.js` to produce and store an `EffectExpectationRecord` before advancing to EXECUTING.

**Completion criterion:** Every transaction that reaches COMMITTED state has a corresponding `EffectExpectationRecord` stored before EXECUTING begins.

---

### W2-10 — Wire RT-14 ConsequenceObservationRecord into outcome-registry.js

| Gap IDs | GAP-14-001 |
|---------|------------|
| Files | `lib/runtime/outcome-registry.js`, `lib/runtime/types/consequence-observation-record.js` |

Modify `outcome-registry.js` to produce a `ConsequenceObservationRecord` for each recorded outcome, including divergence score computation.

**Completion criterion:** Every outcome record produces a `ConsequenceObservationRecord` with a numeric `divergence_score`.

---

### W2-11 — Wire RT-06 Coherence Checks (GCR-1 through GCR-7)

| Gap IDs | GAP-06-001, GAP-06-002 |
|---------|------------------------|
| Files | `lib/constitution/spec.js`, New: `lib/runtime/coherence-checker.js`, `lib/runtime/types/coherence-violation-record.js` |
| Constitutional source | R6-v1.1.1-canonical.md GCR-1 through GCR-7 |

Create `lib/runtime/coherence-checker.js` that runs the seven GCR checks in sequence. Each failed check produces a `CoherenceViolationRecord`. Wire `spec.js` `verify()` to invoke the coherence checker.

**GCR checks to implement:**
- GCR-1: Authority consistency check
- GCR-2: Reality fabric consistency check
- GCR-3: Memory temporal consistency check
- GCR-4: Observation-knowledge consistency check
- GCR-5: Decision-authority chain check
- GCR-6: Action-expectation alignment check
- GCR-7: Amendment integrity check

**Completion criterion:** Running `coherence-checker.check()` on a valid system state returns zero violations. Running it with a deliberately injected authority inconsistency returns a GCR-1 `CoherenceViolationRecord`.

---

### W2-12 — RT-09 Knowledge Record Emission into understanding layer

| Gap IDs | GAP-09-001 |
|---------|------------|
| Files | `migrations/068_understanding_layer.sql`, New: `lib/knowledge/knowledge-store.js`, `lib/runtime/types/knowledge-record.js` |

Create `lib/knowledge/knowledge-store.js` that wraps `understanding_scores` with constitutional `KnowledgeRecord` CRUD operations.

**Completion criterion:** `knowledgeStore.record(domain, claim, certainty)` creates a `KnowledgeRecord` in the database with lifecycle_state = PROVISIONAL.

---

## WAVE 3 — MISSING RUNTIME IMPLEMENTATIONS

**Objective:** Implement the constitutional runtime behaviors that are currently absent (stubs, dead, or entirely missing). This wave builds new functionality.

**Pre-conditions:** Wave 2 complete. All constitutional object types wired into existing systems.

**Duration estimate:** Very Large (8–12 weeks)

---

### W3-01 — RT-16 Amendment Runtime (CRITICAL)

| Gap IDs | GAP-16-001 |
|---------|------------|
| Files | `lib/constitution/amendments.json`, New: `lib/runtime/amendment-pipeline.js`, New: `lib/runtime/amendment-vote-manager.js`, New: `routes/amendments.js` |
| Constitutional source | R16-v1.0-canonical.md, D7 Part 12, A1-v1.2 §12.8 |
| Errata note | C0-ERRATA-016A: RS-13/RS-16 cite D7 §6.1 instead of D7 Part 12. Implement against D7 Part 12. |

**The 15-step amendment execution pipeline (from A1-v1.2 §12.8):**
1. Amendment Proposal Receipt
2. Proposer Authority Verification
3. Amendment Class Determination (Class I/II/III/IV)
4. Class I Human Governance Checkpoint (D7 §12.2 — requires human actors)
5. Amendment Draft Specification
6. Constitutional Impact Assessment (cross-runtime coherence check)
7. Stakeholder Notification (domain broadcast)
8. Review Period (48h minimum for Class II; 7 days for Class I)
9. Vote Collection (quorum per amendment class)
10. Vote Tally and Certification
11. Ratification Gate (all GCR checks pass)
12. Amendment Application
13. Canonical Document Update
14. RT-06 Post-Amendment Coherence Sweep
15. Amendment Record Sealed in `amendments.json`

**Deliverables:**
- `lib/runtime/amendment-pipeline.js` implementing the 15-step pipeline as a state machine
- `lib/runtime/amendment-vote-manager.js` tracking votes per amendment class
- `routes/amendments.js` exposing: `POST /amendments/propose`, `GET /amendments/:id`, `POST /amendments/:id/vote`, `GET /amendments/status`
- `amendments.json` migrated from stub to a proper append-only amendment log

**Note on Class I amendments:** Human governance actors (D7 §12.2) are required for Founding-level amendments. The pipeline must block at Step 4 and emit a notification requiring human action. Do not implement automated Class I approval.

**Risk:** This is the most complex single implementation item. The 15-step pipeline has multiple external dependencies (RT-06 coherence check, quorum mechanism from RT-11, authority verification from RT-02). Implement as a stub pipeline first (Steps 1–3 and 15 only) that logs but does not block. Then add each step incrementally.

**Completion criterion:** An amendment proposal for a Class IV editorial change can be submitted, voted on, approved by quorum, applied, and sealed in `amendments.json` without human intervention. A Class I amendment proposal is received and blocked at Step 4 pending human action.

---

### W3-02 — RT-08 Observation Boundary Enforcement

| Gap IDs | GAP-08-002 |
|---------|------------|
| Files | `lib/observer-health/index.js`, New: `lib/runtime/observation-boundary.js` |
| Constitutional source | R8-v1.1-canonical.md |

RT-08 requires an observation boundary: no observation enters the knowledge layer without passing through the Observation Runtime's boundary validation. Currently observations can flow directly from sensors to any consumer.

**Deliverables:**
- `lib/runtime/observation-boundary.js` implementing boundary validation
- Boundary check: sensor authorization, observation confidence threshold, temporal validity
- Integration into `lib/observer-health/index.js` such that all outbound observations pass through the boundary

**Completion criterion:** An observation from an unregistered sensor is rejected at the boundary. An observation below the confidence threshold is flagged as UNVALIDATED before passing to the knowledge layer.

---

### W3-03 — RT-01 Identity Continuity Enforcement

| Gap IDs | GAP-01-003 |
|---------|------------|
| Files | `lib/constitution/identity-continuity.js`, `migrations/037_kernel_identity_tables.sql`, `lib/runtime/types/identity-record.js` |

`lib/constitution/identity-continuity.js` exists (8.5K) but does not emit constitutional `IdentityRecord` types. Wire it into the constitutional identity lifecycle. Ensure every identity state transition is recorded.

**Completion criterion:** Agent identity state transitions (ACTIVE → SUSPENDED → TERMINATED) produce a corresponding `IdentityRecord` update with the new state.

---

### W3-04 — RT-15 Domain Instances 11 and 12

| Gap IDs | GAP-15-001 |
|---------|------------|
| Files | `civilisation/domain-loader.js`, `migrations/` |
| Constitutional source | R15-v1.0-canonical.md |

The constitutional spec requires 12 domain instances (DOM-000001 through DOM-000012). The repository has 10 (DOM-000001 through DOM-000010). Two domains must be added.

**Pre-condition for this specific item:** The domain charter for DOM-000011 and DOM-000012 must be authored. The constitutional spec authorizes implementation of any twelve domain instances that together cover civilization-scale responsibility scope. Review existing domain charters for DOM-000001–000010 and determine the two missing domains.

**Deliverables:**
- `civilisation/domain-loader.js` updated with DOM-000011 and DOM-000012 entries
- Domain genome configurations for both new instances
- Database migration for the two new domain rows

**Note:** DOM-000001 special bootstrapping (Temporal Coherence Bootstrapping per R15-v1.0 and C0-MANIFEST §5.3) must remain as the first-initialized domain. The two new domains must initialize after DOM-000001 bootstrap completes.

**Completion criterion:** `civilisation/domain-loader.js` DOMAIN_MAP contains twelve entries; the system starts with all twelve domains registering without errors.

---

### W3-05 — RT-03 Constitutional Loop Wiring Completion

| Gap IDs | GAP-03-003, GAP-PIPE-001 |
|---------|--------------------------|
| Files | `middleware/civilization-kernel.js`, `lib/runtime/execution-transaction.js`, `lib/reality/fabric.js`, `lib/constitution/spec.js` |
| Constitutional source | A1-v1.2 §12.1 (10-phase Constitutional Loop execution order) |

The Constitutional Loop phases (A1-v1.2 §15.2) must be fully wired through `middleware/civilization-kernel.js`. Currently the middleware implements: INIT → IDENTITY → CONSTITUTION → GOALS → ATTENTION → route → POST_HOOK.

**Missing phases and their implementations:**

| Phase | Status | Required Action |
|-------|--------|----------------|
| Phase 1 (Identity Activation) | PARTIAL — middleware IDENTITY step exists | Wire to `IdentityRecord` validation |
| Phase 2 (Authority Validation) | PARTIAL — constitutional gate exists | Wire Gate 1 to `AuthorityRecord` check |
| Phase 3 (Observation Intake) | MISSING — no Observation Boundary | Depends on W3-02 |
| Phase 4 (Knowledge Synthesis) | PARTIAL — understanding layer exists | Wire `KnowledgeRecord` emission |
| Phase 5 (Intelligence Analysis) | PARTIAL — SIE invoked | Wire `CUM` output |
| Phase 6 (Civilization Council) | PARTIAL — consensus.js exists | Wire `CivilizationalDecisionProposal` |
| Phase 7 (Decision) | PARTIAL — decision lattice exists | Wire `CivilizationalDecision` |
| Phase 8 (Action Execution) | PARTIAL — PETL exists | Wire `EffectExpectationRecord` |
| Phase 9 (Reflection) | PARTIAL — outcome-registry exists | Wire `ConsequenceObservationRecord` |
| Phase 10 (Coherence Sweep) | MISSING — no GCR sweep at loop end | Depends on W2-11 |

**Completion criterion:** A request processed through the full Constitutional Loop produces a chain of constitutional objects: `IdentityRecord` → `AuthorityRecord` → `ObservationRecord` → `KnowledgeRecord` → `CUM` → `CivilizationalDecisionProposal` → `CivilizationalDecision` → `EffectExpectationRecord` → `ConsequenceObservationRecord` → CoherenceViolationRecord (zero violations on clean run).

---

### W3-06 — RT-04 Formal AuditRecord Introduction

| Gap IDs | GAP-04-001 |
|---------|------------|
| Files | `lib/audit/decision_ledger.js`, New: `lib/runtime/types/audit-record.js` |
| Constitutional source | R4-v1.0-canonical.md |

The audit ledger (`decision_ledger.js`) is a strong pre-constitutional implementation. Introduce `AuditRecord` as a named type wrapping ledger entries. Every constitutional loop execution must produce at minimum one `AuditRecord`.

**Deliverables:**
- `lib/runtime/types/audit-record.js`: `{record_id, loop_execution_ref, actor_ref, decision_ref, action_ref, outcome_ref, coherence_verdict, timestamp, integrity_hash}`
- Modify `decision_ledger.record_execution_receipt()` to produce an `AuditRecord` in addition to its existing SHA-256 integrity hash

**Completion criterion:** Every request completing the full Constitutional Loop produces an `AuditRecord` in the audit ledger.

---

## WAVE 4 — LEGACY SYSTEM REMEDIATION

**Objective:** Systematically resolve the overlaps and legacy systems identified in `I0-LEGACY-AND-OVERLAP-REGISTER.md`. Consolidate agent-system into the constitutional layer where appropriate. Delete confirmed dead code.

**Pre-conditions:** Wave 3 complete. All constitutional behaviors implemented.

**Duration estimate:** Large (6–8 weeks)

---

### W4-01 — Eliminate Duplicate Reality Loop

| Overlap IDs | OVL-013 |
|-------------|---------|
| Files | `lib/reality/reality_loop.js` (canonical), `lib/intelligence/reality-loop.js` (deletion candidate) |

1. Audit all callers of `lib/intelligence/reality-loop.js`
2. Redirect callers to `lib/reality/reality_loop.js`
3. Confirm zero callers remain
4. Delete `lib/intelligence/reality-loop.js`

---

### W4-02 — Eliminate Duplicate Episodic Memory

| Overlap IDs | OVL-004 |
|-------------|---------|
| Files | `lib/memory/episodic-memory-pg.js` (canonical), `agent-system/episodic-memory.js` (deletion candidate) |

1. Audit all callers of `agent-system/episodic-memory.js`
2. Redirect callers to `lib/memory/episodic-memory-pg.js`
3. Confirm zero callers remain
4. Delete `agent-system/episodic-memory.js`

---

### W4-03 — Consolidate Three Orchestrators

| Overlap IDs | OVL-010 |
|-------------|---------|
| Files | `agent-system/orchestrator.js` (115.3K), `agent-system/master-orchestrator.js` (52.8K), `lib/cognitive-orchestrator.js` |

This is the largest single consolidation task. Approach:
1. Identify which orchestrator is the active execution host for the Constitutional Loop (expected: `middleware/civilization-kernel.js` is the constitutional host, not any of these three)
2. Identify which functions in the pre-constitutional orchestrators are NOT yet implemented in the constitutional layer
3. Migrate those functions to appropriate `lib/runtime/` modules
4. Once all functions are migrated, mark orchestrators as deprecated with a header comment
5. Delete only after zero active callers confirmed

**Risk:** `orchestrator.js` at 115.3K is extremely large. This task requires dedicated effort. Do not attempt in one pass.

---

### W4-04 — Consolidate lib/cognitive/ Legacy Engines

| Overlap IDs | OVL-021 |
|-------------|---------|
| Files | `lib/cognitive/` (entire directory) |

1. Using the boundary map from PWA-01, classify each cognitive engine as: (a) superseded by `lib/` implementation, (b) supplementary non-constitutional, (c) unimplemented constitutional functionality
2. For (a): delete after callers redirected
3. For (b): document as non-constitutional; move to `lib/cognitive/adapters/` to make the classification visible
4. For (c): create Wave 3 extension tasks to implement the missing constitutional behavior

---

### W4-05 — Unify API Surface for RT-09/RT-10/RT-11

| Overlap IDs | OVL-023 |
|-------------|---------|
| Files | `routes/cognitive.js`, `routes/cognitive-eval.js`, `routes/cognitive-evolution.js`, `routes/intelligence.js`, `routes/intelligence-memory.js` |

Map each route to its constitutional runtime. Rename routes to match constitutional runtime designations. Where routes overlap, consolidate. Final state: one route file per constitutional runtime that has an external API.

---

### W4-06 — Resolve governance.js Logic Placement

| Overlap IDs | OVL-025 |
|-------------|---------|
| Files | `routes/governance.js` (30.0K), `lib/governance.js` (46.5K) |

Audit `routes/governance.js` for logic that belongs in `lib/governance.js`. Extract and relocate. Route files must contain only request parsing and response formatting; all governance logic must be in the library.

---

## WAVE 5 — VERIFICATION AND ERRATA RESOLUTION

**Objective:** Run the full constitutional specification against the completed implementation. Resolve accepted errata. Produce the I1 Implementation Verification Report.

**Pre-conditions:** Waves 1–4 complete.

**Duration estimate:** Medium (2–3 weeks)

---

### W5-01 — Constitutional Errata Remediation

Address all 24 accepted errata in C0-CONSTITUTIONAL-ERRATA-REGISTER.md. The errata are non-blocking for implementation but should be corrected before the first post-constitution amendment cycle.

Priority order:
1. C0-ERRATA-016A (RT-16 cites D7 §6.1; should cite D7 Part 12) — Fix in R16-v1.0-canonical.md via RT-16 pipeline
2. C0-ERRATA-009 (RS-06 A0 §4.3 citation specificity) — Fix in R9-v1.0-canonical.md
3. GS-07 through GS-17, GS-19 (version reference updates) — Fix in respective documents
4. Remaining Class IV errata — Fix in document revision cycle

---

### W5-02 — Full Constitutional Loop End-to-End Verification

Run the complete Constitutional Loop (A1-v1.2 §12.1 all 10 phases) against a test scenario and verify:
1. All 10 phases execute in order
2. Each phase produces the constitutional object type defined in its runtime specification
3. The AuditRecord captures the full chain
4. Zero GCR violations on clean input
5. GCR violations are correctly raised on malformed input
6. RT-16 amendment proposal is submitted, voted, applied, and sealed correctly

---

### W5-03 — Produce I1 Implementation Verification Report

The I1 report is the post-implementation equivalent of this I0 baseline. It should:
- Repeat the RT-01 through RT-16 coverage matrix with updated coverage percentages
- Document every resolved gap from I0-IMPLEMENTATION-GAP-REGISTER.md
- Document every resolved overlap from I0-LEGACY-AND-OVERLAP-REGISTER.md
- Identify any new gaps discovered during implementation
- Certify constitutional object type completeness

---

## APPENDIX A — WAVE SUMMARY TABLE

| Wave | Name | Pre-conditions | Duration | Key Output |
|------|------|---------------|----------|------------|
| PWA | Boundary Declaration | None | Small | AGENT-SYSTEM-BOUNDARY.md + route collision resolved |
| W1 | Constitutional Object Types | PWA | Medium | 12 new type files in lib/runtime/types/ |
| W2 | Constitutional Wiring | W1 | Large | Existing systems emit constitutional types |
| W3 | Missing Runtime Implementations | W2 | Very Large | RT-16 pipeline, observation boundary, domain instances 11-12, full loop wiring |
| W4 | Legacy Remediation | W3 | Large | agent-system/ consolidated; lib/cognitive/ classified |
| W5 | Verification and Errata | W4 | Medium | I1 Implementation Verification Report |

---

## APPENDIX B — CRITICAL PATH

The following items are on the critical path — blocking multiple downstream waves:

1. **PWA-01** (agent-system boundary declaration) — blocks all waves
2. **PWA-02** (route collision resolution) — blocks W3-04, W3-05
3. **W1-01 through W1-12** (constitutional types) — blocks all of Wave 2
4. **W2-05** (Gate 6 wiring) — blocks W3-05 (full loop)
5. **W2-06** (PETL Step 3 CUM validation) — blocks W3-05 (full loop)
6. **W3-01** (RT-16 amendment pipeline) — blocks W5-01 (errata remediation via constitutional process)
7. **W3-05** (constitutional loop completion) — blocks W5-02 (end-to-end verification)

---

## APPENDIX C — IMPLEMENTATION CONSTRAINTS (From Constitutional Specification)

These constraints are fixed by the constitutional specification and may not be altered by implementation decisions:

1. **RT-16 is absent from all 10 standard Constitutional Loop phases.** It operates via A1-v1.2 §12.8 15-step amendment execution order only. Do not add RT-16 to the Constitutional Loop.

2. **RT-12 owns CivilizationalDecision. RT-11 owns CivilizationalDecisionProposal.** Do not reverse this assignment.

3. **Gate 6 uses RT-05 ChangeRecord/HistoricalAnchor history, not RT-07 temporal record.** This is explicitly fixed in C0-MANIFEST §5.2 item 9.

4. **D4-v1.0 is historical only.** All projection framework implementation must reference D4-v2.0-canonical.md.

5. **DOM-000001 Temporal Coherence Bootstrapping must be the first domain to initialize.** Per C0-MANIFEST §5.3.

6. **Class I amendments (D7 §12.2) require human actors.** The amendment pipeline must not automate Class I approval under any circumstances.

7. **The constitutional authority order (D-series > A-series > R0 > R1–R16) is immutable.** No implementation decision may override a higher-tier constitutional provision.

---

*End of I0-IMPLEMENTATION-ROADMAP.md*
*Roadmap ID: I0-ROADMAP | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
