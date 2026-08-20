# I1 — IMPLEMENTATION SEQUENCING
## APEX Constitutional Architecture — Engineering Order (Wave 0–5)

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I1-IMPLEMENTATION-SEQUENCING |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | I0-IMPLEMENTATION-ROADMAP.md; I1-ARCHITECTURE (Parts 6–7); I1-RUNTIME-MAPPING.md |

**Purpose:** This document specifies the exact engineering order for all implementation tasks, Wave 0 through Wave 5. Every task includes: prerequisites, complexity estimate, risk level, required runtimes, required constitutional object types, expected outputs, verification requirements, and exit criteria.

**Reading this document:** Tasks within a wave are listed in execution order. Do not begin a task until its listed prerequisites are complete. Wave gates are hard stops — the wave exit criteria must be met before the next wave begins.

---

## COMPLEXITY SCALE

| Code | Description | Typical Duration |
|------|-------------|-----------------|
| S | Small — single file, clear scope | < 2 hours |
| M | Medium — 2–5 files, one module boundary | 2–8 hours |
| L | Large — 5–15 files, cross-module wiring | 1–3 days |
| XL | Extra Large — 15+ files, new state machine | 3–5 days |

## RISK SCALE

| Code | Description | Required Action |
|------|-------------|----------------|
| LOW | No production impact; additive only | Standard review |
| MEDIUM | New behavior; potential side effects | Integration test required |
| HIGH | Modifies production path; breaking risk | Full regression test + deployment window |
| CRITICAL | Modifies PETL/Gate sequence; constitutional core | Maximum review + staging validation |

---

## WAVE 0 — PRE-WAVE (BLOCKING PREREQUISITES)

Wave 0 tasks are not implementation — they are declarations and structural fixes that must exist before any Wave 1 code is written. Wave 1 cannot begin until both Wave 0 tasks are complete and verified.

**Wave 0 exit gate:** `routes/civilization.js` is the only civilization route mounted. Boundary declaration document exists at `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md`.

---

### PWA-01 — Agent-System / Lib Boundary Declaration

| Field | Value |
|-------|-------|
| Task ID | PWA-01 |
| Complexity | S |
| Risk | LOW |
| Required Runtimes | None |
| Required Object Types | None |

**Description:** Produce the boundary declaration document that specifies the interface between `agent-system/` (pre-constitutional execution environment) and `lib/` (constitutional implementation layer). This is a documentation artifact, not code.

**Prerequisites:** None.

**Action:**
1. Create `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md`
2. Document: which agent-system operations are Class A (must route through PETL) vs. Class B
3. Document: which lib/ modules agent-system/ is permitted to call
4. Document: the deferral decision for Wave 4

**Expected Output:**
- `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md`

**Verification:**
- Document reviewed and approved before Wave 1 begins

**Exit Criteria:**
- [ ] Boundary document exists
- [ ] The two execution environments are named and described
- [ ] Class A vs Class B classification for agent operations is specified

---

### PWA-02 — Route Collision Resolution (OVL-001)

| Field | Value |
|-------|-------|
| Task ID | PWA-02 |
| Complexity | M |
| Risk | HIGH |
| Required Runtimes | None |
| Required Object Types | None |
| OVL Reference | OVL-001 (CRITICAL) |

**Description:** `routes/civilisation.js` and `routes/civilization.js` are a duplicate+conflict pair. `civilization.js` is the canonical route. `civilisation.js` must be merged and deleted.

**Prerequisites:** None (this blocks everything else).

**Action:**
1. Audit all endpoints in `routes/civilisation.js`; identify any not present in `routes/civilization.js`
2. Migrate unique endpoints to `routes/civilization.js` with correct internal sub-prefix `/civilization/`
3. Verify `server.js` mounts only `civilization.js` under the canonical path
4. Delete `routes/civilisation.js`
5. Run `node --check server.js`

**Expected Output:**
- `routes/civilisation.js` deleted
- `routes/civilization.js` contains all previously-unique endpoints from both files
- `server.js` has single mount for civilization routes

**Verification:**
- `node --check server.js` passes
- All previously-working civilization endpoints respond correctly (manual or test)

**Exit Criteria:**
- [ ] `routes/civilisation.js` does not exist
- [ ] `routes/civilization.js` contains all migrated routes
- [ ] No duplicate route paths in `server.js`
- [ ] `node --check server.js` passes

---

## WAVE 1 — CONSTITUTIONAL OBJECT TYPE INTRODUCTION

**Wave goal:** All 35 constitutional object types defined as JavaScript schema objects in `lib/constitutional-types/`. No behavior wiring in Wave 1 — types only. Types are schemas (plain objects or classes with validation); they do not have database dependencies.

**Wave 1 principle:** Types are introduced in dependency order — foundational types first, derived types after. No type may reference another type that has not been introduced yet.

**Wave 1 exit gate:** `require('lib/constitutional-types/index.js')` loads all 35 types without error. Each type file passes `node --check`. No existing tests are broken.

---

### W1-01 — Constitutional Types Registry

| Field | Value |
|-------|-------|
| Task ID | W1-01 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | PWA-01, PWA-02 |
| Required Runtimes | None |
| Required Object Types | None (this creates the registry) |

**Description:** Create `lib/constitutional-types/index.js` as the central registry of all 35 constitutional object types. In Wave 1, this file is a stub that will be populated as type files are created in W1-02 through W1-15.

**Action:**
1. Create `lib/constitutional-types/` directory
2. Create `lib/constitutional-types/index.js` as an empty registry with a comment listing all 35 types to be added

**Expected Output:**
- `lib/constitutional-types/index.js` (stub)

**Exit Criteria:**
- [ ] `lib/constitutional-types/index.js` exists
- [ ] `node --check lib/constitutional-types/index.js` passes

---

### W1-02 — RT-01 Identity Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-02 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-01 |
| Required Object Types | None |
| Constitutional Basis | A0-v1.1.1 §3.1; R1-v1.1 |

**Description:** Define 7 RT-01 constitutional object type schemas in `lib/constitutional-types/identity-record.js`.

**Types to define:**
- `ActorProfile` — wraps humans/agents rows; fields: actor_id, actor_type (HUMAN/AGENT), display_name, registered_at, status
- `ExternalReference` — reference to external identity source; fields: source_system, source_id, resolved_at
- `StructuralIdentityRecord` — structural identity (cryptographic or biometric); fields: record_id, actor_id, structure_hash, created_at
- `SemanticIdentityRecord` — semantic identity (role, description); fields: record_id, actor_id, semantic_descriptor, domain_refs
- `ReferentialIdentityRecord` — referential identity (external attestations); fields: record_id, actor_id, attestation_source, attestation_ref
- `IdentityConflictRecord` — identity conflict event; fields: conflict_id, actor_a_ref, actor_b_ref, conflict_type, detected_at, status
- `IdentityEndRecord` — identity lifecycle termination; fields: end_id, actor_id, reason, ended_at, authorized_by

**Action:**
1. Create `lib/constitutional-types/identity-record.js`
2. Export all 7 type schema constructors/validators
3. Register all 7 in `lib/constitutional-types/index.js`

**Exit Criteria:**
- [ ] 7 type schemas exported from `identity-record.js`
- [ ] `node --check lib/constitutional-types/identity-record.js` passes
- [ ] All 7 registered in `index.js`

---

### W1-03 — RT-02 Authority Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-03 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-02 |
| Required Runtimes | RT-02 |
| Constitutional Basis | A0-v1.1.1 §3.2; D6 §4.2–4.7 |

**Types to define:**
- `DelegationRecord` — authority delegation event; fields: delegation_id, grantor_ref, grantee_ref, authority_type, scope_ref, granted_at, expires_at
- `AuthorityClaim` — claim of authority for an operation; fields: claim_id, actor_ref, authority_type, scope_ref, claim_basis, timestamp
- `AuthorityRevocationRecord` — authority revoked; fields: revocation_id, delegation_ref, reason, revoked_by, revoked_at
- `AuthorityConflictRecord` — conflicting authority claims; fields: conflict_id, claim_a_ref, claim_b_ref, resolution, detected_at
- `AuthorityScope` — scope of an authority grant; fields: scope_id, domain_refs, operation_types, resource_constraints

**Exit Criteria:**
- [ ] 5 type schemas exported from `authority-certificate.js`
- [ ] Registered in `index.js`

---

### W1-04 — RT-05 Reality Fabric Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-04 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-05 |
| Constitutional Basis | A0-v1.1.1 §3.5; D-3 |

**Types to define:**
- `ChangeRecord` — stage transition record; fields: change_id, claim_ref, stage_from, stage_to, transition_vector, timestamp, actor_ref, historical_anchor_ref
- `HistoricalAnchor` — per-claim change anchor; fields: anchor_id, claim_ref, latest_change_id, first_seen_at, last_modified_at
- `FabricFoundingRoot` — URO founding record; fields: root_id, fabric_id, founded_at, founding_actor
- `ObjectLifecycleRecord` — wraps claim_lifecycle_events row; fields: lifecycle_id, claim_ref, stage, transitioned_at

**Exit Criteria:**
- [ ] 4 type schemas exported from `change-record.js`
- [ ] Registered in `index.js`

---

### W1-05 — RT-07 Memory Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-05 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-07 |
| Constitutional Basis | A0-v1.1.1 §3.7; RT07-v1.0 |

**Types to define:**
- `HistoricalStateRecord` — snapshot of historical memory state; fields: record_id, actor_ref, query_timestamp, assembled_layers, provenance_chain_ref
- `ProvenanceChain` — chain of custody for an operation; fields: chain_id, links, created_at, complete_flag
- `MemoryLifecycleRecord` — memory entry lifecycle event; fields: lifecycle_id, layer, entry_ref, event_type, timestamp
- `HistoricalStateQueryResult` — RT-07→RT-03 interface object; fields: query_id, query_timestamp, historical_layers, temporal_validity_ms, status

**Exit Criteria:**
- [ ] 4 type schemas exported from `historical-state-record.js`
- [ ] `HistoricalStateQueryResult` exported (critical for W2-01)
- [ ] Registered in `index.js`

---

### W1-06 — RT-08 Observation Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-06 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-08 |
| Constitutional Basis | A0-v1.1.1 §3.8; D5 PI-1–PI-12 |

**Types to define:**
- `ObservationRecord` — canonical observation; fields: record_id, observer_ref, subject, observation_type, raw_data_ref, observation_context, timestamp, lineage_ref
- `ObserverRegister` — observer registration; fields: register_id, observer_ref, observation_scope, calibration_level, registered_at
- `ObservationChannelRecord` — channel through which observation arrived; fields: channel_id, channel_type, observer_ref, trust_level
- `ConsequenceObservationRecord` — consequence re-observation (Loop Phase 9); fields: record_id, action_ref, expectation_ref, observed_outcome, divergence_flag, timestamp
- `ObserverLimitationRecord` — observer limitation notice; fields: limitation_id, observer_ref, limitation_type, scope, recorded_at

**Exit Criteria:**
- [ ] 5 type schemas exported from `observation-record.js`
- [ ] Registered in `index.js`

---

### W1-07 — RT-09 Knowledge Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-07 |
| Complexity | M |
| Risk | LOW |
| Prerequisites | W1-06 |
| Required Runtimes | RT-09 |
| Constitutional Basis | A0-v1.1.1 §3.9 |

**Types to define:**
- `EvidenceObject` — evidence derived from ObservationRecord; fields: evidence_id, observation_ref, evidence_type, strength, produced_at
- `InterpretationRecord` — interpretation applied to evidence; fields: record_id, evidence_ref, protocol_ref, interpretation, confidence
- `BeliefObject` — belief formed from evidence; fields: belief_id, evidence_refs, belief_statement, confidence, last_updated
- `KnowledgeClaim` — claim of knowledge; fields: claim_id, claim_statement, evidence_chain, certainty_level, domain_ref
- `KnowledgeState` — epistemic state for a domain (DKS-1–4); fields: state_id, domain_ref, dks_level (UNKNOWN/PARTIAL/BELIEVED/CONFIRMED), coverage, timestamp
- `ContradictionRecord` — contradiction between knowledge claims; fields: record_id, claim_a_ref, claim_b_ref, contradiction_type, detected_at
- `RealityGapEntry` — gap in knowledge coverage; fields: gap_id, domain_ref, gap_type, gap_description, detected_at
- `EpistemicProtocol` — protocol governing interpretation; fields: protocol_id, protocol_name, protocol_rules, version

**Exit Criteria:**
- [ ] 8 type schemas exported from `knowledge-record.js`
- [ ] Registered in `index.js`

---

### W1-08 — RT-10 Understanding Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-08 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-07 |
| Required Runtimes | RT-10 |
| Constitutional Basis | A0-v1.1.1 §3.10 |

**Types to define:**
- `DomainUnderstandingModel` — per-domain understanding model; fields: model_id, domain_ref, knowledge_state_refs, synthesis_timestamp, confidence, inference_protocol_ref
- `InferenceProtocol` — protocol governing inference; fields: protocol_id, protocol_name, inference_rules, domain_scope
- `UnderstandingDegradationFlag` — flag indicating understanding degradation; fields: flag_id, domain_ref, degradation_type, severity, detected_at

**Exit Criteria:**
- [ ] 3 type schemas exported from `cum.js`
- [ ] Registered in `index.js`

---

### W1-09 — RT-11 Civilization Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-09 |
| Complexity | M |
| Risk | LOW |
| Prerequisites | W1-08 |
| Required Runtimes | RT-11 |
| Constitutional Basis | A0-v1.1.1 §3.11 |

**Types to define:**
- `CivilizationUnderstandingModel` (CUM) — synthesis of all domain models; fields: cum_id, domain_model_refs, synthesis_timestamp, coherence_score, strategic_implications
- `DeliberationRecord` — record of deliberation session; fields: record_id, session_ref, participants, evidence_refs, conclusion_type, deliberation_timestamp
- `CausalModel` — causal model of civilization state; fields: model_id, nodes, edges, model_timestamp, domain_scope
- `AssumptionRegister` — register of active assumptions; fields: register_id, assumptions, last_updated, validation_status
- `StrategicPlan` — strategic plan emerging from deliberation; fields: plan_id, deliberation_ref, objectives, timeline, resource_estimate
- `CivilizationCoherenceState` — coherence state of civilization understanding; fields: state_id, coherence_score, violation_refs, assessed_at
- `CivilizationalDecisionProposal` — proposal for CivilizationalDecision; fields: proposal_id, deliberation_ref, decision_type, proposed_action, authority_basis, submitted_to_rt12_at

**Exit Criteria:**
- [ ] 7 type schemas exported from `civilizational-decision-proposal.js`
- [ ] Registered in `index.js`

---

### W1-10 — RT-12 Decision Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-10 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-09 |
| Required Runtimes | RT-12 |
| Constitutional Basis | A0-v1.1.1 §3.12; RT12-v1.0; C0-MANIFEST §5.2 item 4 |

**Types to define:**
- `CivilizationalDecision` — sealed decision; fields: decision_id, proposal_ref, compliance_ref, decision_type, sealed_at, authorized_by
- `OpenActionRegisterEntry` — entry in open action register; fields: entry_id, decision_ref, action_type, status, opened_at, expected_completion
- `DecisionArchiveRecord` — archived decision; fields: archive_id, decision_ref, archive_reason, archived_at
- `CivilizationalDecisionChainRecord` — chain of decisions; fields: chain_id, decision_refs, chain_type, chain_established_at
- `ComplianceVerificationRecord` — result of compliance check; fields: record_id, proposal_ref, verdict (COMPLIANT/NON_COMPLIANT), violations, authority_basis, timestamp

**Exit Criteria:**
- [ ] 5 type schemas exported from `civilizational-decision.js`
- [ ] Registered in `index.js`

---

### W1-11 — RT-13/RT-14 Action and Consequence Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-11 |
| Complexity | M |
| Risk | LOW |
| Prerequisites | W1-10 |
| Required Runtimes | RT-13, RT-14 |
| Constitutional Basis | A0-v1.1.1 §3.13–3.14; D5 |

**Types to define (RT-13):**
- `ActionProjection` — projection of action into external reality; fields: projection_id, decision_ref, action_type, projection_vector, projected_at
- `EffectExpectationRecord` — expected effects of action; fields: record_id, action_ref, expected_effects, basis, produced_at (at COMMITTED state)
- `IrreversibilityClassificationRecord` — irreversibility of action; fields: record_id, action_ref, classification (REVERSIBLE/PARTIALLY_REVERSIBLE/IRREVERSIBLE), basis
- `ProjectionResponsibilityRecord` — accountability for projection; fields: record_id, projection_ref, responsible_actor, authority_ref
- `ProjectionBoundaryCrossingRecord` — boundary crossing event; fields: record_id, action_ref, crossed_at, boundary_type

**Types to define (RT-14):**
- `ObservedConsequenceRecord` — observed consequence of action; fields: record_id, action_ref, expectation_ref, observed_outcome, divergence_score, observed_at
- `CausalModelDivergenceRecord` — divergence between expected and observed; fields: record_id, consequence_ref, expected_state, observed_state, divergence_type
- `OpenActionRegisterTerminalStatusRecord` — terminal status for open action; fields: record_id, entry_ref, terminal_status, completed_at
- `ReflectionTriggerRecord` — trigger for reflection cycle; fields: record_id, cause, trigger_type, triggered_at

**Exit Criteria:**
- [ ] 9 type schemas exported across `effect-expectation-record.js` and `consequence-observation-record.js`
- [ ] Registered in `index.js`

---

### W1-12 — RT-06 Coherence Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-12 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-06 |
| Constitutional Basis | A0-v1.1.1 §3.6; R6-v1.1.1 |

**Types to define:**
- `CoherenceViolationRecord` — record of coherence violation; fields: record_id, gcr_check_id (1–7), violation_type, affected_objects, severity, detected_at
- `CoherenceResolutionEvent` (CRE) — resolution of a coherence conflict; fields: event_id, violation_ref, resolution_action, resolved_by, resolved_at
- `CoherenceConflictRecord` (CCR) — record of a coherence conflict; fields: record_id, conflicting_claims, conflict_type, detected_at, status
- `CUMDegradationRecord` — CUM degradation event; fields: record_id, cum_ref, degradation_type, severity, detected_at
- `DomainCoherenceStatus` — coherence status for a domain; fields: status_id, domain_ref, coherence_score, violations_open, assessed_at

**Exit Criteria:**
- [ ] 5 type schemas exported from `coherence-violation-record.js`
- [ ] Registered in `index.js`

---

### W1-13 — RT-03/RT-04 Kernel and Audit Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-13 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-03, RT-04 |
| Constitutional Basis | A0-v1.1.1 §3.3–3.4; D-4; D6 AIR-5 |

**Types to define (RT-03):**
- `RejectionRecord` — gate rejection; fields: record_id, gate_id, reason, actor_ref, rejected_at
- `AccountabilityRecord` — accountability for an operation; fields: record_id, operation_ref, actor_ref, authority_ref, timestamp
- `RollbackProvenanceRecord` — provenance of a rollback; fields: record_id, operation_ref, rollback_reason, rolled_back_at
- `SuspensionNotice` — actor suspension; fields: notice_id, actor_ref, reason, suspended_at, expires_at
- `KernelOperationManifest` — manifest of a PETL transaction; fields: manifest_id, tx_id, gates_passed, object_types_committed, finalized_at

**Types to define (RT-04):**
- `ConstitutionalAuditRecord` — wraps decision_ledger row; fields: record_id, operation_ref, audit_type, actor_ref, result, timestamp, provenance_chain_ref
- `ConstitutionalComplianceAttestation` — compliance attestation; fields: attestation_id, operation_ref, compliant, violations, attested_at
- `ConstitutionalViolationRecord` — PROH-N violation; fields: record_id, violation_code (PROH-1–9), description, detected_at, actor_ref
- `AuditScope` — scope of an audit; fields: scope_id, audit_type, target_runtime, time_range, produced_by
- `PreservationAuditRecord` — preservation audit for RT-16 Class I amendments; fields: record_id, amendment_ref, preserved_elements, verified_at, verdict

**Exit Criteria:**
- [ ] 10 type schemas exported across `kernel-record.js` and `audit-record.js`
- [ ] Registered in `index.js`

---

### W1-14 — RT-15 Domain Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-14 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-01 |
| Required Runtimes | RT-15 |
| Constitutional Basis | A0-v1.1.1 §3.15 |

**Types to define (per-instance types):**
- `DomainProfile` — domain identity and scope; fields: domain_id, domain_name, domain_type, scope_definition, authority_refs
- `DomainAuthorityRecord` — authority granted to domain; fields: record_id, domain_id, authority_type, scope, granted_at
- `DomainActorProfileRegistry` — registry of actors in domain; wraps domain_agents; fields: registry_id, domain_id, actor_profiles
- `DomainKnowledgeChain` — knowledge chain for domain; fields: chain_id, domain_id, knowledge_record_refs, last_updated
- `DomainCoherenceAssessment` — coherence assessment; fields: assessment_id, domain_id, coherence_score, assessed_at
- `DomainFailureModeRecord` — failure mode for domain; fields: record_id, domain_id, failure_type, detected_at, resolution_status
- `CrossDomainRelationshipRecord` — relationship between domains; fields: record_id, domain_a, domain_b, relationship_type, established_at

**Exit Criteria:**
- [ ] 7 type schemas exported from `domain-profile.js`
- [ ] Registered in `index.js`

---

### W1-15 — RT-16 Amendment Type Definitions

| Field | Value |
|-------|-------|
| Task ID | W1-15 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-09 |
| Required Runtimes | RT-16 |
| Constitutional Basis | A0-v1.1.1 §3.16; R16-v1.0; A1-v1.2 §12.8 |

**Types to define:**
- `AmendmentProposal` — proposed amendment; fields: proposal_id, class (I/II/III/IV), proposer_deliberation_ref, amendment_text, constitutional_basis, proposed_at
- `AmendmentRegistry` — registry of active amendment proposals; fields: registry_id, proposals, last_updated
- `RatifiedAmendmentRecord` — ratified amendment; fields: record_id, proposal_ref, ratification_vote, ratified_at, effective_at
- `AmendmentRejectionRecord` — rejected amendment; fields: record_id, proposal_ref, rejection_reason, rejected_at

**Exit Criteria:**
- [ ] 4 type schemas exported from `amendment-proposal.js`
- [ ] Registered in `index.js`
- [ ] GAP-16-002 resolved

---

### W1-16 — Constitutional Types Registry Completion

| Field | Value |
|-------|-------|
| Task ID | W1-16 |
| Complexity | S |
| Risk | LOW |
| Prerequisites | W1-02 through W1-15 |

**Description:** Finalize `lib/constitutional-types/index.js` to export all 35+ constitutional object types.

**Action:**
1. Complete `index.js` with all type file requires
2. Export all types under canonical names
3. Verify count: must be ≥ 35 types

**Exit Criteria:**
- [ ] `require('lib/constitutional-types/index.js')` loads without error
- [ ] All 35 required types exported
- [ ] `node --check lib/constitutional-types/index.js` passes
- [ ] No existing `require()` calls in codebase broken

---

### WAVE 1 EXIT GATE

Before proceeding to Wave 2, verify:
- [ ] All W1-01 through W1-16 exit criteria satisfied
- [ ] `node --check` passes on all new files
- [ ] No existing tests broken
- [ ] `lib/constitutional-types/index.js` exports ≥ 35 types

---

## WAVE 2 — CONSTITUTIONAL WIRING

**Wave goal:** Wire existing implementations to emit and consume constitutional object types. All existing modules are connected to the constitutional object type layer. The Constitutional Loop produces typed objects at every phase boundary.

**Wave 2 principle:** No existing logic is rewritten. New code wraps existing code to emit types. Constitutional gates are extended, not replaced. Every task is additive.

**Wave 2 exit gate:** PETL Step 2 queries RT-07 (GAP-03-001 fixed). Gate 6 operational (GAP-03-002 fixed). Stage 10 MPW signal emitted (GAP-03-003 fixed). ChangeRecord produced on every `advanceClaim()` call (GAP-05-001 fixed).

---

### W2-01 — RT-07: Add getHistoricalState() Interface

| Field | Value |
|-------|-------|
| Task ID | W2-01 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W1-05, W1-16 |
| Required Runtimes | RT-07 |
| Required Object Types | HistoricalStateQueryResult |
| Fixes | GAP-07-001 |

**Description:** Add `getHistoricalState(timestamp)` method to `lib/memory/gateway.js` returning a formal `HistoricalStateQueryResult` object. This unblocks W2-02 (PETL Step 2).

**Action:**
1. Add `getHistoricalState(timestamp)` to `gateway.js`
2. Method assembles relevant memory layers for the given timestamp
3. Returns `HistoricalStateQueryResult` with `query_id`, `historical_layers` (episodic, semantic, decision), `temporal_validity_ms`, `status`
4. Run `node -e "require('./lib/memory/gateway')"` to verify module loads

**Expected Output:**
- `lib/memory/gateway.js` with new method

**Verification:**
- Unit test: `getHistoricalState(timestamp)` returns `HistoricalStateQueryResult` with all required fields
- `query_id` is a valid UUID
- `status` is one of `'VALID' | 'PARTIAL' | 'UNAVAILABLE'`

**Exit Criteria:**
- [ ] Method exists on gateway
- [ ] Returns typed `HistoricalStateQueryResult`
- [ ] Migration 089 created (historical_state_records table)

---

### W2-02 — RT-03: Wire PETL Step 2 (Historical Contextualization)

| Field | Value |
|-------|-------|
| Task ID | W2-02 |
| Complexity | M |
| Risk | CRITICAL |
| Prerequisites | W2-01 |
| Required Runtimes | RT-03, RT-07 |
| Required Object Types | HistoricalStateQueryResult |
| Fixes | GAP-03-001 |
| Preservation | PETL 5-state machine preserved |

**Description:** At PENDING→PREFLIGHT transition in `execution-transaction.js`, call `gateway.getHistoricalState(timestamp)` and attach `HistoricalStateQueryResult.query_id` to the transaction context.

**Action:**
1. In `execution-transaction.js`, at the PENDING→PREFLIGHT state advance: call `gateway.getHistoricalState(req.timestamp || Date.now())`
2. Attach result to transaction context: `ctx.historical_context_id = result.query_id`
3. If `result.status === 'UNAVAILABLE'`, log warning but do NOT block (non-blocking gap — RT-07 unavailability must not halt the system)
4. Run `node --check lib/runtime/execution-transaction.js`

**Expected Output:**
- `execution-transaction.js` with Step 2 wiring

**Verification:**
- Integration test: PETL transaction context includes `historical_context_id` after Step 2
- System does not halt when RT-07 returns UNAVAILABLE

**Exit Criteria:**
- [ ] `ctx.historical_context_id` present in every PREFLIGHT+ transaction
- [ ] `node --check` passes
- [ ] GAP-03-001 resolved

---

### W2-03 — RT-05: Add ChangeRecord Production to advanceClaim()

| Field | Value |
|-------|-------|
| Task ID | W2-03 |
| Complexity | M |
| Risk | HIGH |
| Prerequisites | W1-04 |
| Required Runtimes | RT-05 |
| Required Object Types | ChangeRecord, HistoricalAnchor |
| Fixes | GAP-05-001 |
| Preservation | 13-stage lifecycle preserved |

**Description:** Modify `lib/reality/fabric.js` `advanceClaim()` to produce a `ChangeRecord` and update the `HistoricalAnchor` on every stage transition. Apply migration 080.

**Action:**
1. Create migration `080_change_records.sql`: `change_records` and `historical_anchors` tables (append-only)
2. In `fabric.advanceClaim()`, after successful stage transition: produce `ChangeRecord` and persist to `change_records`
3. Add `fabric.getChangeHistory(claimId)` method returning `ChangeRecord[]`
4. Update `HistoricalAnchor` for the claim after each transition
5. Run `node --check lib/reality/fabric.js`

**Expected Output:**
- `lib/reality/fabric.js` with ChangeRecord production
- `migrations/080_change_records.sql`

**Verification:**
- Integration test: after `advanceClaim()`, `change_records` table contains a new row
- `getChangeHistory(claimId)` returns array of `ChangeRecord`

**Exit Criteria:**
- [ ] Every `advanceClaim()` produces a persisted `ChangeRecord`
- [ ] `HistoricalAnchor` updated per claim
- [ ] `getChangeHistory()` method exists
- [ ] Migration 080 applied
- [ ] GAP-05-001 resolved

---

### W2-04 — RT-03: Add Gate 6 (Temporal Integrity)

| Field | Value |
|-------|-------|
| Task ID | W2-04 |
| Complexity | M |
| Risk | CRITICAL |
| Prerequisites | W2-03 |
| Required Runtimes | RT-03, RT-05 |
| Required Object Types | ChangeRecord |
| Fixes | GAP-03-002 |
| Preservation | Gate sequence 1→2→3→4→5→6 preserved; Gate 6 added as last |

**Description:** Add Gate 6 to `lib/runtime/constitutional-gate.js`. Gate 6 calls `fabric.getChangeHistory(claimId)` and checks temporal integrity — no stale ChangeRecord presented as current.

**Action:**
1. In `constitutional-gate.js`, add Gate 6 check after Gates 1–5
2. Gate 6 calls `fabric.getChangeHistory(claimId)` for the primary claim ref in the operation
3. If the most recent ChangeRecord timestamp exceeds `temporal_validity_ms` (from HistoricalStateQueryResult), Gate 6 DENY
4. Gate 6 must be the 6th check — CLI-1 prohibits reordering
5. Run `node --check lib/runtime/constitutional-gate.js`

**Expected Output:**
- `constitutional-gate.js` with Gate 6 added

**Verification:**
- Unit test: Gate 6 DENY when ChangeRecord timestamp indicates stale object
- Unit test: Gate 6 PASS when ChangeRecord is current
- Verify gate order: 1→2→3→4→5→6 in sequence

**Exit Criteria:**
- [ ] Gate 6 exists in `constitutional-gate.js`
- [ ] Gate 6 queries `fabric.getChangeHistory()` NOT `gateway.getHistoricalState()`
- [ ] Gate sequence order verified (I1-ARCHITECTURE §15.1 Immutable Constraint)
- [ ] `node --check` passes
- [ ] GAP-03-002 resolved

---

### W2-05 — RT-03: Add Stage 10 MPW Signal

| Field | Value |
|-------|-------|
| Task ID | W2-05 |
| Complexity | S |
| Risk | MEDIUM |
| Prerequisites | W1-12 |
| Required Runtimes | RT-03, RT-06 |
| Required Object Types | CoherenceViolationRecord (consumed by RT-06) |
| Fixes | GAP-03-003 |

**Description:** After every EXECUTING→FINALIZED transition in `execution-transaction.js`, emit `constitutional.stage10.mpw` event on `lib/event-bus.js`.

**Action:**
1. In `execution-transaction.js` at EXECUTING→FINALIZED transition: emit `eventBus.emit('constitutional.stage10.mpw', { tx_id, committed_object_ids, loop_phase })`
2. This is Class B (async, non-blocking): emit and do not await

**Exit Criteria:**
- [ ] `constitutional.stage10.mpw` emitted after every FINALIZED transition
- [ ] Emission is non-blocking (async)
- [ ] GAP-03-003 resolved

---

### W2-06 — RT-09: Knowledge Layer — lib/knowledge/ Creation

| Field | Value |
|-------|-------|
| Task ID | W2-06 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W1-07 |
| Required Runtimes | RT-09 |
| Required Object Types | EvidenceObject, KnowledgeRecord, KnowledgeClaim |

**Description:** Create `lib/knowledge/record.js` and `lib/knowledge/evidence-pipeline.js`. Wire `lib/intelligence/knowledge-validator.js` to produce formal `KnowledgeRecord` types. Apply migration 083.

**Action:**
1. Create migration `083_knowledge_records.sql`
2. Create `lib/knowledge/record.js` — KnowledgeRecord CRUD (with `lineage_ref` pointing to ObservationRecord)
3. Create `lib/knowledge/evidence-pipeline.js` — `ObservationRecord → EvidenceObject → KnowledgeRecord` pipeline
4. Wrap `knowledge-validator.js` output with `KnowledgeRecord` type
5. Run `node -e "require('./lib/knowledge/record')"` to verify module loads

**Exit Criteria:**
- [ ] `lib/knowledge/record.js` exists and exports KnowledgeRecord functions
- [ ] `KnowledgeRecord.lineage_ref` traces to `ObservationRecord.record_id` (INV-4)
- [ ] Migration 083 applied

---

### W2-07 — RT-12: Decision Compliance Gate — lib/decision/ Creation

| Field | Value |
|-------|-------|
| Task ID | W2-07 |
| Complexity | M |
| Risk | HIGH |
| Prerequisites | W1-10, W1-16 |
| Required Runtimes | RT-12 |
| Required Object Types | ComplianceVerificationRecord, CivilizationalDecision, OpenActionRegisterEntry |

**Description:** Create `lib/decision/compliance-gate.js` wrapping `decision-lattice.js` output as `ComplianceVerificationRecord`. Create `lib/decision/objects.js` for OpenActionRegisterEntry. Apply migration 084.

**Action:**
1. Create migration `084_compliance_records.sql`
2. Create `lib/decision/compliance-gate.js`: wraps `decision-lattice.js` verdict as `ComplianceVerificationRecord`
3. Create `lib/decision/objects.js`: OpenActionRegisterEntry management
4. Refactor `consensus.js` to submit `CivilizationalDecisionProposal` to compliance gate before sealing Decision
5. Verify Gate 5 in `constitutional-gate.js` validates formal `ComplianceVerificationRecord`

**Exit Criteria:**
- [ ] `lib/decision/compliance-gate.js` exists and returns `ComplianceVerificationRecord`
- [ ] Gate 5 validates typed `ComplianceVerificationRecord`
- [ ] Migration 084 applied

---

### W2-08 — RT-13: EffectExpectationRecord at COMMITTED State

| Field | Value |
|-------|-------|
| Task ID | W2-08 |
| Complexity | M |
| Risk | HIGH |
| Prerequisites | W1-11 |
| Required Runtimes | RT-13 |
| Required Object Types | EffectExpectationRecord, ProjectionBoundaryCrossingRecord |
| Enforcement | INV-7: EffectExpectationRecord precedes action execution |

**Description:** Create `lib/action/effect-expectation.js`. At PREFLIGHT→COMMITTED transition in `execution-transaction.js`, produce `EffectExpectationRecord` before EXECUTING state is reached. Apply migration 085.

**Action:**
1. Create migration `085_effect_expectations.sql`
2. Create `lib/action/effect-expectation.js`
3. In `execution-transaction.js` at COMMITTED state (before EXECUTING): call `effectExpectation.produce(ctx)` and attach to transaction context
4. Create `lib/action/projection-record.js` wrapping `outcome-registry.js`

**Exit Criteria:**
- [ ] `EffectExpectationRecord` persisted in DB before EXECUTING state reached (INV-7)
- [ ] Migration 085 applied

---

### W2-09 — RT-14: ConsequenceObservationRecord

| Field | Value |
|-------|-------|
| Task ID | W2-09 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W2-08 |
| Required Runtimes | RT-14 |
| Required Object Types | ObservedConsequenceRecord, ConsequenceObservationRecord |
| Enforcement | INV-6: every action must have a ConsequenceObservationRecord |

**Description:** Create `lib/reflection/consequence-record.js`. Refactor `outcome-registry.js` to produce `ObservedConsequenceRecord`. Refactor post-response hook in `civilization-kernel.js` to emit `constitutional.loop.consequence`. Apply migration 086.

**Action:**
1. Create migration `086_consequence_observations.sql`
2. Create `lib/reflection/consequence-record.js`
3. Wrap `outcome-registry.js` output with `ObservedConsequenceRecord` type
4. Refactor `civilization-kernel.js` post-hook to emit `constitutional.loop.consequence` event

**Exit Criteria:**
- [ ] `ObservedConsequenceRecord` produced after every FINALIZED action
- [ ] `constitutional.loop.consequence` emitted from post-hook
- [ ] Migration 086 applied

---

### W2-10 — RT-06: GCR Evaluator — lib/coherence/ Creation

| Field | Value |
|-------|-------|
| Task ID | W2-10 |
| Complexity | L |
| Risk | MEDIUM |
| Prerequisites | W2-05, W1-12 |
| Required Runtimes | RT-06 |
| Required Object Types | CoherenceViolationRecord, DomainCoherenceStatus |

**Description:** Create `lib/coherence/gcr-evaluator.js` implementing GCR-1 through GCR-7. Subscribe to `constitutional.stage10.mpw` event. Apply migration 081.

**Action:**
1. Create migration `081_coherence_violations.sql`
2. Create `lib/coherence/gcr-evaluator.js`:
   - Listen for `constitutional.stage10.mpw` event
   - On each event: evaluate committed objects against 7 coherence registers
   - Produce `CoherenceViolationRecord` for each violation; persist to DB
   - Emit `constitutional.coherence.violation` for each violation
3. Create `lib/coherence/domain-status.js`: produce `DomainCoherenceStatus` per evaluation

**Exit Criteria:**
- [ ] GCR-1 through GCR-7 checks implemented
- [ ] `CoherenceViolationRecord` produced and persisted for every violation
- [ ] `constitutional.coherence.violation` emitted to RT-04 and RT-15
- [ ] Migration 081 applied

---

### W2-11 — RT-10: Wrap SIE as CUM Type

| Field | Value |
|-------|-------|
| Task ID | W2-11 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W1-08, W1-09 |
| Required Runtimes | RT-10, RT-11 |
| Required Object Types | CivilizationUnderstandingModel, DomainUnderstandingModel |

**Description:** Wrap `lib/intelligence/sie.js` output with formal `CivilizationUnderstandingModel` type. Wire PAIR 32: CUM delivery to RT-11 via `constitutional.loop.understanding` event.

**Action:**
1. Wrap `sie.js` output object as `CivilizationUnderstandingModel` type
2. Emit `constitutional.loop.understanding` after every SIE synthesis
3. Wire `civilisation/consensus.js` to consume `constitutional.loop.understanding` event (PAIR 32)
4. Verify II-12: CUM invalidation notifies RT-11

**Exit Criteria:**
- [ ] SIE output wrapped as `CivilizationUnderstandingModel`
- [ ] `constitutional.loop.understanding` event emitted
- [ ] RT-11 consumes CUM from event (PAIR 32 wired)

---

### W2-12 — New Route Files (Wave 2 APIs)

| Field | Value |
|-------|-------|
| Task ID | W2-12 |
| Complexity | M |
| Risk | LOW |
| Prerequisites | W2-06, W2-07 |
| Required Runtimes | RT-01, RT-02, RT-06, RT-09, RT-12, RT-13, RT-14 |

**Description:** Create new route files for all Wave 2 runtimes. All routes must use internal sub-prefixes per CLAUDE.md rule.

**Routes to create:**
- `routes/identity.js` — `/api/identity/*` (RT-01)
- `routes/authority.js` — `/api/authority/*` (RT-02)
- `routes/coherence.js` — `/api/coherence/*` (RT-06)
- `routes/knowledge.js` — `/api/knowledge/*` (RT-09)
- `routes/decisions.js` — `/api/decisions/*` (RT-12)
- `routes/actions.js` — `/api/actions/*` (RT-13)
- `routes/reflection.js` — `/api/reflection/*` (RT-14)

**Exit Criteria:**
- [ ] All 7 route files created
- [ ] Each uses internal sub-prefix matching its filename
- [ ] Each mounted in `server.js`
- [ ] `node --check server.js` passes

---

### WAVE 2 EXIT GATE

Before proceeding to Wave 3, verify:
- [ ] GAP-03-001 resolved (PETL Step 2 queries RT-07)
- [ ] GAP-03-002 resolved (Gate 6 operational)
- [ ] GAP-03-003 resolved (Stage 10 MPW signal)
- [ ] GAP-05-001 resolved (ChangeRecord production)
- [ ] GAP-07-001 resolved (HistoricalStateQueryResult interface)
- [ ] Migrations 080–086, 088, 089 applied
- [ ] All new modules load without `MODULE_NOT_FOUND` errors
- [ ] `node --check server.js` passes

---

## WAVE 3 — MISSING RUNTIMES

**Wave goal:** Implement the three major missing systems: RT-16 amendment pipeline (the largest task), RT-08 observation boundary, and RT-15 domain completion. Wire the full Constitutional Loop end-to-end.

**Wave 3 principle:** These are new implementations, not refactors. Higher risk than Waves 1–2. Staging verification required before production deployment.

---

### W3-01 — RT-16: Full Amendment Pipeline (XL)

| Field | Value |
|-------|-------|
| Task ID | W3-01 |
| Complexity | XL |
| Risk | HIGH |
| Prerequisites | Wave 2 complete, W1-15 |
| Required Runtimes | RT-16, RT-11, RT-03, RT-04 |
| Required Object Types | AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord, AmendmentRejectionRecord, PreservationAuditRecord |
| Fixes | GAP-16-001, GAP-16-002 |
| Constitutional Constraint | RT-16 absent from Constitutional Loop (II-08) |

**Description:** Implement the full 15-step amendment pipeline from A1-v1.2 §12.8. This is the largest single task in the implementation plan.

**15 Amendment Pipeline Steps to implement:**
1. Proposal receipt (from RT-11 only — verify caller)
2. Proposal classification (Class I/II/III/IV)
3. Registry registration
4. [Class I] Human actor authorization gate (block until human approves)
5. RT-04 Preservation Audit (BLOCK — must return PASS before proceeding)
6. Constitutional impact assessment
7. Deliberation announcement
8. Deliberation period (configurable duration)
9. Vote collection
10. Quorum verification
11. Tally
12. Amendment commit (passes through all 6 RT-03 gates — PAIR 61)
13. [On PASS] RatifiedAmendmentRecord production
14. [On PASS] Broadcast to all runtimes
15. [On FAIL] AmendmentRejectionRecord production

**Action:**
1. Create migration `087_amendments.sql`
2. Create `lib/amendment/pipeline.js` — 15-step state machine
3. Create `lib/amendment/classifier.js` — Class I/II/III/IV determination
4. Create `lib/amendment/preservation-audit.js` — PreservationAuditRecord for RT-04 gate
5. Create `routes/amendments.js` — `/api/amendments/*`
6. Mount in `server.js`
7. Wire PAIR 61: amendment commit calls `execution-transaction.begin()` with all 6 gates
8. Migrate `lib/constitution/amendments.json` content to `amendments` table
9. Run `node -e "require('./lib/amendment/pipeline')"` to verify load

**Expected Outputs:**
- `lib/amendment/pipeline.js`
- `lib/amendment/classifier.js`
- `lib/amendment/preservation-audit.js`
- `routes/amendments.js`
- `migrations/087_amendments.sql`

**Verification:**
- Unit test: `pipeline.receive()` rejects calls not from RT-11 deliberation
- Unit test: Class I proposal blocks at Step 4 without human authorization
- Integration test: full amendment cycle — proposal → ratification → broadcast
- Verify: no RT-16 code in `civilization-kernel.js` loop handlers (II-08)

**Exit Criteria:**
- [ ] 15-step state machine implemented per A1-v1.2 §12.8
- [ ] RT-16 self-initiation impossible (`pipeline.receive()` checks caller)
- [ ] Class I amendments block for human authorization
- [ ] PreservationAuditRecord produced and verified before Class I proceeds
- [ ] Amendment commit routes through PETL all 6 gates (PAIR 61)
- [ ] `constitutional.amendment.ratified` broadcast to all runtimes
- [ ] Migration 087 applied; `amendments.json` migrated
- [ ] GAP-16-001 and GAP-16-002 resolved
- [ ] II-08 verified: no RT-16 in loop handlers

---

### W3-02 — RT-08: Observation Boundary Implementation

| Field | Value |
|-------|-------|
| Task ID | W3-02 |
| Complexity | L |
| Risk | HIGH |
| Prerequisites | Wave 2 complete, W1-06 |
| Required Runtimes | RT-08 |
| Required Object Types | ObservationRecord, ObservationChannelRecord |
| Constitutional Basis | D5 PI-6 Boundary Integrity; I1-ARCHITECTURE Zone 6; II-06 |

**Description:** Create `lib/observation/boundary.js` implementing Zone 6 enforcement. No external data enters the Constitutional Loop without producing an `ObservationRecord`. Refactor `lib/observer-health/index.js` to produce typed `ObservationRecord`. Add `openConsequenceMonitor()` interface.

**Action:**
1. Create `lib/observation/boundary.js` — validates all incoming observations; produces `ObservationRecord`
2. Create `lib/observation/record.js` — ObservationRecord factory
3. Refactor `lib/observer-health/index.js` to call `lib/observation/record.js`
4. Add `openConsequenceMonitor(projectionRecord)` to `lib/observer-health/index.js`
5. Refactor `routes/observatory.js` to serve `/api/observations/` namespace
6. Apply migration 082

**Exit Criteria:**
- [ ] `lib/observation/boundary.js` enforces: no data reaches RT-09 without ObservationRecord (II-06)
- [ ] `lib/observer-health/index.js` produces formal `ObservationRecord`
- [ ] `openConsequenceMonitor()` exists
- [ ] Migration 082 applied

---

### W3-03 — RT-01: Identity Lifecycle Module

| Field | Value |
|-------|-------|
| Task ID | W3-03 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W1-02, W2-01 |
| Required Runtimes | RT-01 |
| Required Object Types | ActorProfile, IdentityConflictRecord |

**Description:** Create `lib/identity/record.js` and `lib/identity/manifest.js`. Refactor `lib/memory/access-controller.js` to return formal `ActorProfile`. Apply migration 088.

**Action:**
1. Create migration `088_identity_records.sql`
2. Create `lib/identity/record.js` wrapping `humans`/`agents` queries as `ActorProfile`
3. Create `lib/identity/manifest.js` for `IdentityManifest` management
4. Refactor `lib/memory/access-controller.js` to call `lib/identity/record.js`
5. Refactor `middleware/civilization-kernel.js` PHASE 2 to hydrate `ActorProfile`

**Exit Criteria:**
- [ ] `lib/identity/record.js` returns `ActorProfile` (not raw DB row)
- [ ] `civilization-kernel.js` PHASE 2 attaches `ActorProfile` to request context
- [ ] Migration 088 applied

---

### W3-04 — RT-15: Domain Instances 11 and 12

| Field | Value |
|-------|-------|
| Task ID | W3-04 |
| Complexity | M |
| Risk | LOW |
| Prerequisites | W1-14 |
| Required Runtimes | RT-15 |
| Required Object Types | DomainProfile |
| Fixes | GAP-15-001 |

**Description:** Create `domains/dom-000011/` and `domains/dom-000012/` following the exact structure of existing domain modules. Register both in `civilisation/domain-loader.js`.

**Action:**
1. Identify identities of domains 11 and 12 per constitutional specification
2. Create `domains/dom-000011/` with `src/runtime/index.js`, `src/config/`, `src/data/` following DOM-000001 structure
3. Create `domains/dom-000012/` with same structure
4. Register both in `civilisation/domain-loader.js`
5. Add assertion: `domains.length === 12`
6. Verify `DOM-000001` initializes first (II-11)

**Exit Criteria:**
- [ ] 12 domain instances registered and loading
- [ ] `domains.length === 12` assertion passes at startup
- [ ] DOM-000001 initializes first
- [ ] GAP-15-001 resolved

---

### W3-05 — Full Constitutional Loop Wiring

| Field | Value |
|-------|-------|
| Task ID | W3-05 |
| Complexity | L |
| Risk | HIGH |
| Prerequisites | W2-01 through W2-11, W3-01 through W3-04 |
| Required Runtimes | All RT-01 through RT-16 |
| Required Object Types | All loop-phase objects |
| Fixes | GAP-PIPE-001 |

**Description:** Wire the full Constitutional Loop end-to-end. All 10 loop phases must be traversable. Each phase boundary must produce a typed constitutional object delivered to the next phase.

**Action:**
1. Wire PAIR 59: `civilisation/consensus.js` deliberation → `lib/amendment/pipeline.receive()` (RT-11 → RT-16)
2. Wire PAIR 61: RT-16 amendment commit → `execution-transaction.begin()` with all 6 gates
3. Wire full Phase 9→10 loop-back: `constitutional.loop.consequence` → RT-08 re-observation
4. Verify all 10 loop phases execute in sequence via `middleware/civilization-kernel.js`
5. Add loop phase annotations to `civilization-kernel.js` matching A1-v1.2 §15.2

**Exit Criteria:**
- [ ] All 10 loop phases wired end-to-end
- [ ] Each phase boundary produces a typed constitutional object
- [ ] PAIR 59 (RT-11 → RT-16) wired
- [ ] PAIR 61 (RT-16 → RT-03 all gates) wired
- [ ] Loop-back Phase 9→10 working
- [ ] GAP-PIPE-001 resolved

---

### W3-06 — RT-04: Formal ConstitutionalAuditRecord

| Field | Value |
|-------|-------|
| Task ID | W3-06 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W1-13 |
| Required Runtimes | RT-04 |
| Required Object Types | ConstitutionalAuditRecord, PreservationAuditRecord |

**Description:** Refactor `lib/audit/decision_ledger.js` to produce formal `ConstitutionalAuditRecord` type. Verify no PETL preflight code path invokes this (INV-9, AIR-5).

**Action:**
1. Wrap audit write output with `ConstitutionalAuditRecord` schema
2. Audit all callers: verify `decision_ledger.js` is not called from PETL preflight stages
3. Add `ConstitutionalViolationRecord` production for PROH-1–9 violations detected

**Exit Criteria:**
- [ ] `decision_ledger.js` produces `ConstitutionalAuditRecord`
- [ ] Not called from PETL preflight (II-09 verified)
- [ ] `ConstitutionalViolationRecord` produced for PROH violations

---

### WAVE 3 EXIT GATE

- [ ] GAP-16-001 and GAP-16-002 resolved (RT-16 pipeline complete)
- [ ] GAP-15-001 resolved (12 domain instances)
- [ ] GAP-PIPE-001 resolved (full Constitutional Loop wired)
- [ ] Observation Boundary (Zone 6) operational
- [ ] Migration 087 applied
- [ ] `node --check server.js` passes
- [ ] Full loop trace producible (Observation → Evidence → Knowledge → Understanding → Deliberation → Decision → Action → Consequence → Updated Understanding)

---

## WAVE 4 — LEGACY REMEDIATION

**Wave goal:** Eliminate legacy duplicates and resolve all OVL-N overlap items. Agent-system boundary assessment. No new constitutional behavior added — consolidation only.

**Wave 4 principle:** Wave 4 is cleanup. All constitutional behavior is now implemented. Wave 4 reduces surface area and eliminates confusion sources.

---

### W4-01 — OVL-009: Merge lib/cognitive/ into civilisation/

| Field | Value |
|-------|-------|
| Task ID | W4-01 |
| Complexity | L |
| Risk | HIGH |
| Prerequisites | Wave 3 complete |
| OVL Reference | OVL-009 (CRITICAL) |

**Description:** Audit all `lib/cognitive/` functionality. Migrate any non-duplicate logic into `civilisation/`. Delete `lib/cognitive/`.

**Action:**
1. Identify all files in `lib/cognitive/`
2. For each file: check if equivalent logic exists in `civilisation/` or `lib/intelligence/`
3. Migrate unique logic to appropriate canonical location
4. Update all `require('lib/cognitive/')` imports across codebase
5. Delete `lib/cognitive/`
6. Run `node --check server.js`

**Exit Criteria:**
- [ ] `lib/cognitive/` does not exist
- [ ] All `require('lib/cognitive/')` imports updated
- [ ] `node --check server.js` passes
- [ ] No functionality regression

---

### W4-02 — Route Deduplication (reality, memory)

| Field | Value |
|-------|-------|
| Task ID | W4-02 |
| Complexity | M |
| Risk | MEDIUM |
| Prerequisites | W4-01 |

**Description:** Merge `routes/reality-architecture.js` → `routes/reality.js`. Merge `routes/intelligence-memory.js` → `routes/memory.js`. Delete source files.

**Action:**
1. Audit endpoints in `routes/reality-architecture.js`; migrate unique endpoints to `routes/reality.js`
2. Audit endpoints in `routes/intelligence-memory.js`; migrate to `routes/memory.js`
3. Update `server.js` mounts
4. Delete `routes/reality-architecture.js` and `routes/intelligence-memory.js`
5. Run `node --check server.js`

**Exit Criteria:**
- [ ] `routes/reality-architecture.js` deleted
- [ ] `routes/intelligence-memory.js` deleted
- [ ] `node --check server.js` passes

---

### W4-03 — Agent-System Boundary Assessment

| Field | Value |
|-------|-------|
| Task ID | W4-03 |
| Complexity | L |
| Risk | MEDIUM |
| Prerequisites | W4-01 |
| OVL Reference | OVL-019 (CRITICAL) |

**Description:** Assess `agent-system/` for consolidation. Identify which agent operations are Class A (must route through PETL). Produce assessment report; implement necessary PETL routing for Class A agent operations.

**Action:**
1. Audit `agent-system/orchestrator.js` and `agent-system/master-orchestrator.js`
2. Classify each operation as Class A (state-mutating) or Class B (query/notification)
3. For Class A operations: add PETL routing
4. Document: `agent-system/episodic-memory.js` is forbidden for new code (Part 17)
5. Produce `docs/constitutional-architecture/I1-AGENT-SYSTEM-ASSESSMENT.md`

**Exit Criteria:**
- [ ] Assessment report produced
- [ ] All Class A agent operations route through PETL
- [ ] No new code references `agent-system/episodic-memory.js`

---

### W4-04 — OVL-013: Reality Loop Confirmation

| Field | Value |
|-------|-------|
| Task ID | W4-04 |
| Complexity | S |
| Risk | LOW |
| OVL Reference | OVL-013 |

**Description:** Confirm `lib/reality/reality_loop.js` is the only active reality loop. Identify and remove any competing loop.

**Exit Criteria:**
- [ ] Only one reality loop active in the system
- [ ] `lib/reality/reality_loop.js` is the canonical loop

---

### W4-05 — Remaining OVL Items

| Field | Value |
|-------|-------|
| Task ID | W4-05 |
| Complexity | M |
| Risk | LOW |

**Description:** Resolve any remaining OVL-N items from `I0-LEGACY-AND-OVERLAP-REGISTER.md` not already addressed in Waves 0–4.

**Exit Criteria:**
- [ ] All OVL items classified CRITICAL or HIGH are resolved
- [ ] OVL items classified MEDIUM or LOW are documented and deferred or resolved

---

### WAVE 4 EXIT GATE

- [ ] OVL-001 resolved (Wave 0)
- [ ] OVL-009 resolved (W4-01)
- [ ] OVL-013 resolved (W4-04)
- [ ] No duplicate route files
- [ ] Agent-system Class A operations route through PETL
- [ ] `node --check server.js` passes

---

## WAVE 5 — VERIFICATION

**Wave goal:** Verify the full constitutional implementation. Produce the I1 verification report documenting constitutional compliance state.

---

### W5-01 — Errata Resolution

| Field | Value |
|-------|-------|
| Task ID | W5-01 |
| Complexity | Variable |
| Risk | Variable |
| Prerequisites | Wave 4 complete |

**Description:** Identify and fix any errata discovered during Waves 1–4. This includes: missed gap items, incorrect type schemas, interface contract violations, INV-N violations discovered during integration testing.

**Action:**
1. Review all gap register items (I0-IMPLEMENTATION-GAP-REGISTER.md): verify each is resolved
2. Run full test suite
3. Fix any remaining gaps with priority: CRITICAL → HIGH → MEDIUM

**Exit Criteria:**
- [ ] All CRITICAL gaps from gap register resolved
- [ ] All HIGH gaps resolved or explicitly deferred with justification
- [ ] Full test suite passing

---

### W5-02 — End-to-End Constitutional Loop Verification

| Field | Value |
|-------|-------|
| Task ID | W5-02 |
| Complexity | L |
| Risk | LOW |
| Prerequisites | W5-01 |
| Required Runtimes | All 16 |

**Description:** Execute a complete Constitutional Loop trace from Observation through to Updated Understanding. Verify each phase boundary produces the correct constitutional object type.

**Verification checklist:**
- [ ] Phase 1: External input → `ObservationRecord` produced by RT-08
- [ ] Phase 2: `ObservationRecord` → `EvidenceObject` by RT-09
- [ ] Phase 3: `EvidenceObject` → `KnowledgeRecord` by RT-09
- [ ] Phase 4: `KnowledgeRecord` → `DomainUnderstandingModel` by RT-10
- [ ] Phase 5: `DomainUnderstandingModel` → `CivilizationUnderstandingModel` → `DeliberationRecord` by RT-11
- [ ] Phase 6: `DeliberationRecord` → `CivilizationalDecisionProposal` → `ComplianceVerificationRecord` → `CivilizationalDecision` by RT-11/RT-12
- [ ] Phase 7: `CivilizationalDecision` → `EffectExpectationRecord` → action execution by RT-13
- [ ] Phase 8: External consequence
- [ ] Phase 9: Consequence → `ObservedConsequenceRecord` by RT-14
- [ ] Phase 10: `ObservedConsequenceRecord` → understanding update cycle

**Additional verification:**
- [ ] All 6 Gates fire in sequence 1→6 (CLI-1)
- [ ] RT-07 query occurs at Step 2 (GAP-03-001 fix confirmed)
- [ ] Gate 6 temporal integrity check fires (GAP-03-002 fix confirmed)
- [ ] Stage 10 MPW signal fires (GAP-03-003 fix confirmed)
- [ ] RT-04 audit record produced for each constitutional operation (AIR-5 independence)
- [ ] RT-16 code absent from loop handler (II-08)
- [ ] All 12 RT-15 domain instances active

---

### W5-03 — I1 Verification Report

| Field | Value |
|-------|-------|
| Task ID | W5-03 |
| Complexity | M |
| Risk | LOW |
| Prerequisites | W5-02 |

**Description:** Produce the `I1-VERIFICATION-REPORT.md` documenting constitutional compliance state after Wave 1–5 implementation.

**Report must cover:**
1. Constitutional Loop completeness — is the 10-phase loop fully wired?
2. Runtime coverage — which of 16 runtimes are fully implemented vs. partial?
3. Constitutional object type coverage — which of 35 types are in production?
4. Gap register final state — which gaps remain open?
5. INV-1 through INV-7 compliance status
6. PROH-1 through PROH-9 enforcement status
7. CLI-1 through CLI-4 compliance status
8. Remaining work — what would constitute a second implementation wave?

**Exit Criteria:**
- [ ] `docs/constitutional-architecture/I1-VERIFICATION-REPORT.md` produced
- [ ] All CRITICAL gaps confirmed resolved
- [ ] Constitutional compliance state documented

---

### WAVE 5 EXIT GATE (I1 COMPLETE)

- [ ] All Wave 1–4 exit gates satisfied
- [ ] W5-02 end-to-end loop trace verified
- [ ] W5-03 verification report produced
- [ ] `node --check server.js` passes
- [ ] No CRITICAL constitutional violations in production

---

## CRITICAL PATH SUMMARY

The following tasks form the critical path — each blocks all subsequent tasks:

```
PWA-02 (route collision)
  → W1-01 (type registry)
    → W1-04, W1-05 (RT-05, RT-07 types)
      → W2-01 (getHistoricalState)
        → W2-02 (PETL Step 2)  ← CRITICAL
      → W2-03 (ChangeRecord production)
        → W2-04 (Gate 6)  ← CRITICAL
          → W2-05 (Stage 10 MPW)
            → W2-10 (GCR evaluator)
    → W1-09 through W1-11 (civilization/decision/action types)
      → W2-07 (compliance gate)
      → W2-08 (EffectExpectationRecord)
        → W2-09 (ConsequenceObservationRecord)
          → W3-05 (full loop wiring)
            → W3-01 (RT-16 pipeline)  ← LARGEST
              → W5-02 (end-to-end verification)
```

---

## WAVE SUMMARY TABLE

| Wave | Goal | Tasks | Complexity | Constitutional Risk | Duration Estimate |
|------|------|-------|------------|-------------------|-------------------|
| Wave 0 | Blocking prerequisites | 2 | S/M | HIGH (route collision) | 1 day |
| Wave 1 | Object type introduction | 16 | S–M | LOW | 3–4 days |
| Wave 2 | Constitutional wiring | 12 | M–L | CRITICAL (PETL/Gates) | 1–2 weeks |
| Wave 3 | Missing runtimes | 6 | M–XL | HIGH (RT-16 pipeline) | 2–3 weeks |
| Wave 4 | Legacy remediation | 5 | S–L | MEDIUM | 3–5 days |
| Wave 5 | Verification | 3 | M–L | LOW | 3–4 days |
| **Total** | | **44** | | | **~6 weeks** |

---

## IMPLEMENTATION CONSTRAINTS (MUST NOT VIOLATE)

These apply to every task in every wave:

1. **No stage omission (CLI-1):** Gate sequence 1→6 must be preserved in all gate modifications
2. **No RT-03 self-gating:** `decision_ledger.js` must never appear in PETL preflight code paths
3. **RT-16 exclusion (II-08):** No RT-16 code may appear in `civilization-kernel.js` loop handlers
4. **Gate 6 source (§15.1):** Gate 6 MUST query `fabric.getChangeHistory()`, NOT `gateway.getHistoricalState()`
5. **Append-only tables:** `change_records`, `amendments`, `historical_state_records` must never have UPDATE or DELETE in production code
6. **PETL preservation (Part 18):** The 5-state machine must not be refactored into a different state model
7. **Pre-commit verification:** Run `node -e "require('./path/to/module')"` before committing any new `require()` call
8. **KMP enforcement (PROH-3):** All Class A operations must route through `execution-transaction.js`; no bypass

---

*End of I1-IMPLEMENTATION-SEQUENCING.md*
*Document ID: I1-IMPLEMENTATION-SEQUENCING | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
