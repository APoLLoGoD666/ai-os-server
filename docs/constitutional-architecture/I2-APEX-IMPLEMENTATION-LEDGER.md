# I2 — APEX IMPLEMENTATION LEDGER
## APEX Constitutional Architecture — Master Implementation Tracking System

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I2-LEDGER |
| Phase | I2 — Implementation Control Plane |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Initial State | All runtimes pre-implementation |
| Authority | I2-IMPLEMENTATION-GOVERNANCE-MODEL.md |
| Update Rule | Must be updated after every task completion, gate passage, and migration decision |

**Purpose:** Master tracking system for the APEX constitutional implementation. Every runtime, constitutional object type, repository artifact, migration action, and gate has a record here. This is the single source of truth for implementation progress.

---

## PART 1 — TRACKING SCHEMA

### 1.1 Runtime Tracking Schema

```
RT-NN Entry:
  runtime_id: RT-NN
  canonical_name: [per C0-MANIFEST §5.2]
  constitutional_authority: [A0-v1.1.1 §3.N + canonical R-spec]
  tier: [1–7]
  current_implementation_state: [NONE | STUB | PARTIAL | MIGRATED | VERIFIED]
  migration_state: [EXISTING | AUDITED | MAPPED | ADAPTER_CREATED | MIGRATED | VERIFIED | DEPRECATED | REMOVED]
  assigned_wave: [Wave 0–5]
  critical_gaps: [list of GAP-NN-NNN]
  blocking_dependencies: [list of RT-NN that must reach ADAPTER_CREATED before this RT can reach MIGRATED]
  blocked_by_this: [list of RT-NN that cannot reach MIGRATED until this RT is at ADAPTER_CREATED]
  primary_files_current: [existing files]
  primary_files_target: [target files after migration]
  database_tables_owned: [list]
  verification_evidence: [filed evidence items]
  gate_certifications: [which gates this RT's completion contributes to]
  owner: [Implementation Owner | Implementation Author]
  last_updated: YYYY-MM-DD
  certification_state: [UNCERTIFIED | IN_PROGRESS | CERTIFIED]
  blockers: [list of active blockers]
  notes: [any relevant notes]
```

### 1.2 Constitutional Object Type Tracking Schema

```
TYPE Entry:
  type_id: [e.g., IdentityRecord, ChangeRecord]
  owning_runtime: RT-NN
  constitutional_authority: [R-spec RS-07 cite]
  type_state: [NOT_DEFINED | DEFINED | WIRED | VERIFIED]
  definition_location: [lib/constitutional-types/file.js]
  first_production_location: [lib/module/file.js — where first emitted]
  first_consumption_location: [lib/module/file.js — where first consumed]
  database_backing: [table name or NONE]
  wave_introduced: [1–3]
  blockers: []
```

### 1.3 Repository Artifact Tracking Schema

```
ARTIFACT Entry:
  path: [relative path from Scripts/]
  artifact_type: [FILE | DIRECTORY | TABLE | API | SCHEDULER]
  owning_runtime: RT-NN
  migration_classification: [KEEP | REFACTOR | REPLACE | MERGE | DELETE | WRAP | DEFER | CREATE]
  migration_state: [EXISTING | AUDITED | MAPPED | ADAPTER_CREATED | MIGRATED | VERIFIED | DEPRECATED | REMOVED]
  constitutional_basis: [justification for classification]
  tcl_removal_condition: [if TCL — condition; otherwise N/A]
  wave_assigned: [0–5]
  dependencies: [other artifacts that must be MIGRATED first]
  zero_reference_audit: [N/A | PENDING | COMPLETE — required for REMOVED state]
  owner: [Implementation Owner | Implementation Author]
  idr_reference: [IDR-NNN if applicable]
  last_updated: YYYY-MM-DD
```

### 1.4 Gate Tracking Schema

```
GATE Entry:
  gate_id: [0–6]
  gate_name: [canonical name]
  status: [NOT_REACHED | IN_PROGRESS | PASSED | FAILED]
  entry_date: YYYY-MM-DD or —
  pass_date: YYYY-MM-DD or —
  implementation_owner_signature: [signed / pending]
  validation_checks_passed: [n/total]
  blocking_failures: [list]
  notes: []
```

---

## PART 2 — RUNTIME TRACKING TABLE (RT-01 through RT-16)

### RT-01 — Identity Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-01 |
| Canonical Name | Identity Runtime |
| Constitutional Authority | A0-v1.1.1 §3.1; R1-v1.1-canonical.md |
| Tier | 1 |
| Current Implementation State | PARTIAL (identity inferred from DB; no IdentityRecord type) |
| Migration State | EXISTING |
| Assigned Wave | Wave 1 (types) + Wave 2 (wiring) |
| Critical Gaps | GAP-01-001 (no IdentityRecord), GAP-01-002 (no IdentityManifest), GAP-01-003 (single-entity limitation) |
| Blocking Dependencies | RT-07 must be ADAPTER_CREATED before RT-01 can be MIGRATED (identity history store) |
| Blocked By This | RT-03 Gate 1 (requires ActorProfile); RT-02 (identity required for authority scope) |
| Primary Files (Current) | `lib/memory/access-controller.js`, `migrations/037_kernel_identity_tables.sql` |
| Primary Files (Target) | `lib/identity/record.js` (CREATE), `lib/identity/manifest.js` (CREATE), `lib/constitutional-types/identity-record.js` (CREATE) |
| Database Tables Owned | `humans`, `agents`, `identity_records` (migration 088 — new) |
| Gate Certifications | Gate 5 (identity lifecycle active) |
| Owner | Implementation Author |
| Certification State | UNCERTIFIED |
| Blockers | None (Wave 1 types unblocked) |

---

### RT-02 — Authority Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-02 |
| Canonical Name | Authority Runtime |
| Constitutional Authority | A0-v1.1.1 §3.2; R2-v1.0-canonical.md; D6-v1.0 |
| Tier | 1 |
| Current Implementation State | PARTIAL (authority enforced conceptually; no AIR type taxonomy) |
| Migration State | EXISTING |
| Assigned Wave | Wave 1 (types) + Wave 2 (wiring) |
| Critical Gaps | GAP-02-001 (no five-type AIR taxonomy), GAP-02-002 (no AuthorityCertificate), GAP-02-003 (AIR distinction not enforced in code) |
| Blocking Dependencies | RT-01 must be ADAPTER_CREATED (identity required for authority scope) |
| Blocked By This | RT-03 Gate 3 (requires AuthorityCertificate) |
| Primary Files (Current) | `lib/constitution/authority-resistance.js`, `lib/runtime/constitutional-gate.js` (Gate 3) |
| Primary Files (Target) | `lib/constitution/authority-resistance.js` (REFACTOR), `lib/constitutional-types/authority-certificate.js` (CREATE) |
| Database Tables Owned | `governance_records` (partial — shared with RT-03) |
| Gate Certifications | Gate 3 (authority gate active) |
| Owner | Implementation Author |
| Certification State | UNCERTIFIED |
| Blockers | None (Wave 1 types unblocked) |

---

### RT-03 — Kernel Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-03 |
| Canonical Name | Kernel Runtime |
| Constitutional Authority | A0-v1.1.1 §3.3; R3-v1.0-canonical.md; D-4-v2.0 |
| Tier | 1 |
| Current Implementation State | PARTIAL (PETL operational; Step 2, Gate 6, Stage 10 MPW all missing) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 (critical path) |
| Critical Gaps | GAP-03-001 (Step 2 RT-07 query), GAP-03-002 (Gate 6 missing), GAP-03-003 (Stage 10 MPW missing), GAP-03-004 (KernelRecord type) |
| Blocking Dependencies | GAP-07-001 (RT-07 getHistoricalState) blocks Step 2; GAP-05-001 (ChangeRecord) blocks Gate 6 |
| Blocked By This | ALL runtimes — RT-03 is the gate for all Class A operations |
| Primary Files (Current) | `lib/runtime/execution-transaction.js`, `middleware/civilization-kernel.js`, `lib/runtime/constitutional-gate.js` |
| Primary Files (Target) | Same (REFACTOR only — PRESERVED ARTIFACTS) |
| Database Tables Owned | `governance_records` (gate results), `execution_transactions` (new migration) |
| Gate Certifications | Gate 3 (enforcement active), Gate 5 (full loop) |
| Owner | Implementation Owner (CRITICAL — PRESERVED ARTIFACTS) |
| Certification State | UNCERTIFIED |
| Blockers | Depends on RT-07 (W2-01 before W2-02); Depends on RT-05 (W2-03 before W2-04) |
| Constitutional Preservation | PETL 5-state machine and 6-gate sequence are PRESERVED. Extension only. |

---

### RT-04 — Audit Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-04 |
| Canonical Name | Audit Runtime |
| Constitutional Authority | A0-v1.1.1 §3.4; R4-v1.0-canonical.md; D6 §3.4 AIR-5 |
| Tier | 1 |
| Current Implementation State | PARTIAL (append-only ledger operational; no formal AuditRecord type) |
| Migration State | EXISTING |
| Assigned Wave | Wave 1 (types) + Wave 2 (type wrapping) + Wave 3 (PreservationAuditRecord) |
| Critical Gaps | GAP-04-001 (no formal AuditRecord type), GAP-04-002 (AIR-5 exclusivity not enforced) |
| Blocking Dependencies | None (RT-04 is never gated — D6 AIR-5) |
| Blocked By This | RT-16 (PreservationAuditRecord required for Class I amendments) |
| Primary Files (Current) | `lib/audit/decision_ledger.js`, `apex_audit.ndjson` |
| Primary Files (Target) | Same (REFACTOR only — PRESERVED ARTIFACT) + `lib/amendment/preservation-audit.js` (CREATE, Wave 3) |
| Database Tables Owned | `apex_audit.ndjson` (file), `governance_records` (partial) |
| Gate Certifications | Gate 4 (RT-04 not called from preflight verified) |
| Owner | Implementation Author |
| Constitutional Preservation | `decision_ledger.js` is PRESERVED. Wrapping only. |
| Certification State | UNCERTIFIED |

---

### RT-05 — Reality Fabric Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-05 |
| Canonical Name | Reality Fabric Runtime |
| Constitutional Authority | A0-v1.1.1 §3.5; R5-v1.0-canonical.md; D-3-v1.0 |
| Tier | 1 |
| Current Implementation State | PARTIAL (13-stage fabric operational; ChangeRecord missing) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 |
| Critical Gaps | GAP-05-001 (ChangeRecord/HistoricalAnchor not produced), GAP-05-002 (no Observation Boundary at fabric entry), GAP-05-003 (ChangeRecord not distinct type) |
| Blocking Dependencies | None |
| Blocked By This | RT-03 Gate 6 (requires ChangeRecord); RT-06 GCR (reads ChangeRecord) |
| Primary Files (Current) | `lib/reality/fabric.js`, `lib/reality/reality_loop.js`, `lib/reality/reality_health.js` |
| Primary Files (Target) | `lib/reality/fabric.js` (REFACTOR — extend advanceClaim) |
| Database Tables Owned | `reality_claims`, `claim_lifecycle_events`, `reality_health_scores`, `change_records` (new migration 080), `historical_anchors` (new migration 080) |
| Gate Certifications | Gate 3 (ChangeRecord produced — G3-V3) |
| Owner | Implementation Owner (PRESERVED ARTIFACT) |
| Constitutional Preservation | 13-stage lifecycle and 9-dimension health are PRESERVED. advanceClaim() extension only. |
| Certification State | UNCERTIFIED |
| Blockers | None |

---

### RT-06 — Coherence Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-06 |
| Canonical Name | Coherence Runtime |
| Constitutional Authority | A0-v1.1.1 §3.6; R6-v1.1.1-canonical.md |
| Tier | 2 |
| Current Implementation State | MISSING (no dedicated RT-06 implementation) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 (after Stage 10 MPW) |
| Critical Gaps | GAP-06-001 (entire GCR pipeline missing), GAP-06-002 (no object types), GAP-06-003 (no DomainCoherenceStatus), GAP-06-004 (no CVR→RT-04 delivery) |
| Blocking Dependencies | RT-03 Stage 10 MPW signal must be wired (W2-05) before RT-06 can be triggered |
| Blocked By This | RT-15 DomainCoherenceStatus |
| Primary Files (Target) | `lib/coherence/gcr-evaluator.js` (CREATE), `lib/coherence/domain-status.js` (CREATE) |
| Database Tables Owned | `coherence_violation_records` (new migration 081) |
| Gate Certifications | Gate 4 (GCR wired to Stage 10 MPW — G4-V8) |
| Owner | Implementation Author |
| Certification State | UNCERTIFIED |
| Blockers | W2-05 (Stage 10 MPW) must complete before RT-06 can be wired |

---

### RT-07 — Memory Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-07 |
| Canonical Name | Memory Runtime |
| Constitutional Authority | A0-v1.1.1 §3.7 [NOTE: A0 §3.8 canonical; confirmed by C0-MANIFEST §5.2 item 2]; R7-v1.1-canonical.md |
| Tier | 2 |
| Current Implementation State | PARTIAL (13-layer gateway operational; HSQR interface missing) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 (critical path — first task W2-01) |
| Critical Gaps | GAP-07-001 (HSQR missing), GAP-07-002 (append-only not DB-enforced), GAP-07-003 (additional) |
| Blocking Dependencies | None |
| Blocked By This | RT-03 Step 2 (GAP-03-001 depends on this) |
| Primary Files (Current) | `lib/memory/gateway.js`, `lib/memory/episodic-memory-pg.js`, `lib/memory/semantic-memory-pg.js` (etc.) |
| Primary Files (Target) | `lib/memory/gateway.js` (REFACTOR — add getHistoricalState only — PRESERVED ARTIFACT) |
| Database Tables Owned | `episodic_memory`, `semantic_memory`, `procedural_memory`, `strategic_memory`, `skill_memory`, `decision_memory`, `knowledge_graph`, `reflexion_events`, `improvement_events`, `historical_state_records` (migration 089) |
| Gate Certifications | Gate 3 (HSQR returned by gateway — G3-V1) |
| Owner | Implementation Owner (PRESERVED ARTIFACT — 13-layer architecture) |
| Constitutional Preservation | 13-layer memory architecture PRESERVED. Method addition only. |
| Certification State | UNCERTIFIED |

---

### RT-08 — Observation Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-08 |
| Canonical Name | Observation Runtime |
| Constitutional Authority | A0-v1.1.1 §3.8; R8-v1.1-canonical.md; D5 PI-1–PI-12 |
| Tier | 3 |
| Current Implementation State | PARTIAL (observer sensors operational; ObservationRecord not produced; boundary not enforced) |
| Migration State | EXISTING |
| Assigned Wave | Wave 3 |
| Critical Gaps | GAP-05-002 (Observation Boundary), no ObservationRecord production |
| Blocking Dependencies | Wave 2 complete |
| Blocked By This | RT-09 pipeline (ObservationRecord is the input) |
| Primary Files (Current) | `lib/observer-health/` |
| Primary Files (Target) | `lib/observation/boundary.js` (CREATE), `lib/observation/record.js` (CREATE), `lib/observer-health/` (REFACTOR) |
| Database Tables Owned | `observer_registry`, `calibration_events`, `sensor_health_scores`, `observation_records` (migration 082) |
| Gate Certifications | Gate 5 (Observation Boundary enforced — G5-V7) |
| Owner | Implementation Author |
| Certification State | UNCERTIFIED |

---

### RT-09 — Knowledge Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-09 |
| Canonical Name | Knowledge Runtime |
| Constitutional Authority | A0-v1.1.1 §3.9; R9-v1.0-canonical.md |
| Tier | 3 |
| Current Implementation State | PARTIAL (beliefs and knowledge-validator operational; no KnowledgeRecord with lineage) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 |
| Critical Gaps | No formal KnowledgeRecord; no ObservationRecord→KnowledgeRecord pipeline |
| Blocking Dependencies | RT-08 ObservationRecord (Wave 3 — sequential dependency) |
| Blocked By This | RT-10 DomainUnderstandingModel; RT-03 Gate 4 (epistemic check) |
| Primary Files (Current) | `lib/beliefs/`, `lib/intelligence/knowledge-validator.js` |
| Primary Files (Target) | `lib/knowledge/record.js` (CREATE), `lib/knowledge/evidence-pipeline.js` (CREATE) |
| Database Tables Owned | `understanding_scores`, `understanding_gaps`, `knowledge_records` (migration 083) |
| Gate Certifications | Gate 4 (KnowledgeRecord lineage enforced — G4-V3) |
| Owner | Implementation Author |
| Certification State | UNCERTIFIED |

---

### RT-10 — Intelligence Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-10 |
| Canonical Name | Intelligence Runtime |
| Constitutional Authority | A0-v1.1.1 §3.10; R10-v1.1-canonical.md |
| Tier | 3 |
| Current Implementation State | PARTIAL (SIE operational; no CUM type) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 |
| Critical Gaps | No CivilizationUnderstandingModel type wrapping SIE output |
| Blocking Dependencies | Wave 1 CUM type definition |
| Blocked By This | RT-11 deliberation (PAIR 32 requires CUM delivery) |
| Primary Files (Current) | `lib/intelligence/sie.js`, `lib/understanding/` |
| Primary Files (Target) | `lib/intelligence/sie.js` (WRAP — CUM type on output) |
| Database Tables Owned | Intelligence tables (migrations 019-024) |
| Gate Certifications | Gate 4 (CUM emitted via constitutional.loop.understanding — G4-V7) |
| Owner | Implementation Author |
| Errata | C0-ERRATA-010A (RS-02 §XI vs §VII), C0-ERRATA-010B (RS-29 Decision phase) — accepted |
| Certification State | UNCERTIFIED |

---

### RT-11 — Civilization Intelligence Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-11 |
| Canonical Name | Civilization Intelligence Runtime |
| Constitutional Authority | A0-v1.1.1 §3.11; R11-v1.3-canonical.md |
| Tier | 3 |
| Current Implementation State | PARTIAL (consensus.js operational; OVL-009 conflict; no CivilizationalDecisionProposal type) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 (type wiring) + Wave 4 (OVL-009 cleanup) |
| Critical Gaps | OVL-009 (lib/cognitive/ overlap); no CivilizationalDecisionProposal |
| Blocking Dependencies | RT-10 CUM delivery (PAIR 32) |
| Blocked By This | RT-12 compliance gate; RT-16 amendment initiation (PAIR 59) |
| Primary Files (Current) | `civilisation/consensus.js`, `civilisation/deliberation.js`, `lib/cognitive/` (OVL-009) |
| Primary Files (Target) | `civilisation/consensus.js` (REFACTOR), `lib/cognitive/` (MERGE→DELETE, Wave 4) |
| Database Tables Owned | `consensus_sessions` (migration 063) |
| Gate Certifications | Gate 5 (CivilizationalDecisionProposal produced) |
| Errata | C0-ERRATA-011A through 011E — accepted |
| Owner | Implementation Owner (consensus.js PRESERVED: quorum 5-of-9 is PRESERVED) |
| Certification State | UNCERTIFIED |
| Blockers | OVL-009 resolution deferred to Wave 4 |

---

### RT-12 — Decision Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-12 |
| Canonical Name | Decision Runtime (canonical per C0-MANIFEST §5.2 item 3) |
| Constitutional Authority | A0-v1.1.1 §3.12; RT12-v1.0-canonical.md |
| Tier | 4 |
| Current Implementation State | PARTIAL (decision-lattice operational; constitutional types now DEFINED via W1-10) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 |
| Critical Gaps | Types DEFINED (W1-10 CERTIFIED 2026-07-27); wiring deferred to Wave 2 |
| Blocking Dependencies | RT-11 must produce CivilizationalDecisionProposal (COMPLETE via W1-09) |
| Blocked By This | RT-03 Gate 5 (requires ComplianceVerificationRecord); RT-13 Action |
| Primary Files (Current) | `lib/runtime/decision-lattice.js`, `lib/intent/` |
| Primary Files (Target) | `lib/constitutional-types/civilizational-decision.js` (CREATED W1-10); `lib/decision/compliance-gate.js` (Wave 2); `lib/decision/objects.js` (Wave 2) |
| Database Tables Owned | `compliance_verification_records` (migration 084), `open_action_register` (migration 084) |
| Gate Certifications | Gate 4 (ComplianceVerificationRecord produced — G4-V4) |
| Owner | Implementation Author |
| Certification State | IN_PROGRESS (Wave 1 types DEFINED; Wave 2 wiring required for CERTIFIED) |
| Last Updated | 2026-07-27 |

---

### RT-13 — Action Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-13 |
| Canonical Name | Action Runtime |
| Constitutional Authority | A0-v1.1.1 §3.14; R13-v1.0-canonical.md; D5-v1.0 |
| Tier | 5 |
| Current Implementation State | IN_PROGRESS (types DEFINED W1-11 CERTIFIED 2026-07-27; wiring deferred to Wave 2) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 (wiring); Wave 1 types COMPLETE |
| Critical Gaps | Runtime wiring deferred (execution-transaction.js not yet integrated with EER production) |
| Blocking Dependencies | RT-12 must produce CivilizationalDecision (COMPLETE via W1-10) |
| Blocked By This | RT-14 ObservedConsequenceRecord (requires EER reference); RT-08 consequence monitor (PAIR 42) |
| Primary Files (Current) | `lib/constitutional-types/effect-expectation-record.js` (CREATED W1-11); `lib/runtime/execution-transaction.js` (EXECUTING state) |
| Primary Files (Target) | `lib/action/effect-expectation.js` (CREATE Wave 2), `lib/action/projection-record.js` (CREATE Wave 2) |
| Database Tables Owned | `effect_expectations` (migration 085) |
| Gate Certifications | Gate 4 (EER at COMMITTED — G4-V5) |
| Owner | Implementation Author (but PETL modification requires Implementation Owner review) |
| Errata | C0-ERRATA-013 (RS-20 D5 PI-6/PI-5 citation) — accepted |
| Certification State | IN_PROGRESS (types DEFINED; Last Updated 2026-07-27) |

---

### RT-14 — Reflection Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-14 |
| Canonical Name | Reflection Runtime |
| Constitutional Authority | A0-v1.1.1 §3.15; R14-v1.0-canonical.md |
| Tier | 5 |
| Current Implementation State | IN_PROGRESS (types DEFINED W1-11 CERTIFIED 2026-07-27; wiring deferred to Wave 2) |
| Migration State | EXISTING |
| Assigned Wave | Wave 2 (wiring); Wave 1 types COMPLETE |
| Critical Gaps | Runtime wiring deferred; OAR terminal closure not yet integrated |
| Blocking Dependencies | RT-13 EffectExpectationRecord (COMPLETE via W1-11) |
| Blocked By This | Loop-back to RT-08 (Phase 9→10); understanding update cycle |
| Primary Files (Current) | `lib/constitutional-types/observed-consequence-record.js` (CREATED W1-11); `middleware/civilization-kernel.js` (post-hook) |
| Primary Files (Target) | `lib/reflection/consequence-record.js` (CREATE Wave 2) |
| Database Tables Owned | `consequence_observations` (migration 086) |
| Gate Certifications | Gate 4 (COR produced — G4-V6), Gate 5 (INV-6 enforced — G5-V10) |
| Owner | Implementation Author |
| Certification State | IN_PROGRESS (types DEFINED; Last Updated 2026-07-27) |

---

### RT-15 — Domain Runtime (Twelve Instances)

| Field | Value |
|-------|-------|
| Runtime ID | RT-15 |
| Canonical Name | Domain Runtime (Twelve Instances) |
| Constitutional Authority | A0-v1.1.1 §3.15; R15-v1.0-canonical.md |
| Tier | 6 |
| Current Implementation State | PARTIAL (10 of 12 instances; no formal DomainProfile type) |
| Migration State | EXISTING |
| Assigned Wave | Wave 3 |
| Critical Gaps | GAP-15-001 (DOM-000011, DOM-000012 missing) |
| Blocking Dependencies | Wave 2 complete |
| Blocked By This | Domain count invariant (II-11) |
| Primary Files (Current) | `domains/dom-000001/` through `domains/dom-000010/`, `civilisation/domain-loader.js` |
| Primary Files (Target) | `domains/dom-000011/` (CREATE), `domains/dom-000012/` (CREATE), `civilisation/domain-loader.js` (REFACTOR) |
| Database Tables Owned | `domain_health`, `domain_agents` (migration 039) |
| Gate Certifications | Gate 5 (12 domains active, DOM-000001 first — G5-V5, G5-V6) |
| Owner | Implementation Author |
| Constitutional Preservation | DOM-000001 through DOM-000010 are PRESERVED (may not be deleted without RT-16) |
| Certification State | UNCERTIFIED |
| Note | DOM-000001 conditional responsibility (Temporal Coherence Bootstrapping) must execute before all other domain instances per C0-MANIFEST §5.3 |

---

### RT-16 — Amendment Runtime

| Field | Value |
|-------|-------|
| Runtime ID | RT-16 |
| Canonical Name | Amendment Runtime |
| Constitutional Authority | A0-v1.1.1 §3.17; R16-v1.0-canonical.md; D7-v1.0 Part 12 |
| Tier | 7 |
| Current Implementation State | IN_PROGRESS (types DEFINED W1-15; pipeline Wave 3) |
| Migration State | EXISTING |
| Assigned Wave | Wave 1 (types W1-15 COMPLETE) + Wave 3 (XL pipeline) |
| Critical Gaps | GAP-16-001 (full pipeline missing — Wave 3), GAP-16-002 (4 object types — RESOLVED W1-15) |
| Blocking Dependencies | RT-11 must produce AmendmentProposal; RT-04 PreservationAudit (PAIR 60 BLOCK); RT-03 gates (PAIR 61) |
| Blocked By This | Nothing (RT-16 is out-of-band per C0-MANIFEST §5.2 item 5) |
| Primary Files (Current) | `lib/constitution/amendments.json` (stub) |
| Primary Files (Target) | `lib/amendment/pipeline.js` (CREATE), `lib/amendment/classifier.js` (CREATE), `lib/amendment/preservation-audit.js` (CREATE), `routes/amendments.js` (CREATE) |
| Database Tables Owned | `amendments` (migration 087, append-only) |
| Gate Certifications | Gate 5 (pipeline complete, non-self-initiating, PAIR 59/60/61 wired — G5-V1 through G5-V4, G5-V13) |
| Owner | Implementation Owner |
| Errata | C0-ERRATA-016A (D7 §6.1 should be D7 Part 12), C0-ERRATA-016B — accepted |
| Constitutional Constraints | ABSENT from all 10 standard loop phases (II-08); human auth required for Class I (D7 §12.2) |
| Certification State | UNCERTIFIED |

---

## PART 3 — GATE TRACKING TABLE

| Gate | Name | Status | Entry Date | Pass Date | Owner Sig | Checks Passed | Blockers |
|------|------|--------|-----------|----------|-----------|---------------|---------|
| Gate 0 | Constitutional Freeze Verification | PASSED | 2026-07-25 | 2026-07-25 | Countersigned | 9/9 | None |
| Gate 1 | Repository Baseline Verified | PASSED | 2026-07-25 | 2026-07-25 | Countersigned | 8/8 | None |
| Gate 2 | Core Object Model Established | NOT_REACHED | — | — | Pending | 0/12 | Gate 1 |
| Gate 3 | Authority/Governance Enforcement Active | NOT_REACHED | — | — | Pending | 0/11 | Gate 2 |
| Gate 4 | Runtime Wiring Complete | NOT_REACHED | — | — | Pending | 0/12 | Gate 3 |
| Gate 5 | Runtime Certification Tests Passing | NOT_REACHED | — | — | Pending | 0/15 | Gate 4 |
| Gate 6 | Legacy Retirement Authorized | NOT_REACHED | — | — | Pending | 0/10 | Gate 5 |

---

## PART 4 — CRITICAL GAPS TRACKING TABLE

| Gap ID | Runtime | Severity | Status | Resolved By | Resolution Wave |
|--------|---------|----------|--------|-------------|----------------|
| GAP-01-001 | RT-01 | HIGH | OPEN | W3-03 | Wave 3 |
| GAP-01-002 | RT-01 | MEDIUM | OPEN | W3-03 | Wave 3 |
| GAP-01-003 | RT-01 | MEDIUM | OPEN | W3-03 | Wave 3 |
| GAP-02-001 | RT-02 | HIGH | OPEN | W2 (authority type wiring) | Wave 2 |
| GAP-02-002 | RT-02 | MEDIUM | OPEN | W2 | Wave 2 |
| GAP-02-003 | RT-02 | MEDIUM | OPEN | W2 | Wave 2 |
| GAP-03-001 | RT-03 | CRITICAL | OPEN | W2-02 | Wave 2 |
| GAP-03-002 | RT-03 | CRITICAL | OPEN | W2-04 | Wave 2 |
| GAP-03-003 | RT-03 | HIGH | OPEN | W2-05 | Wave 2 |
| GAP-03-004 | RT-03 | MEDIUM | OPEN | W2 | Wave 2 |
| GAP-04-001 | RT-04 | MEDIUM | OPEN | W2 | Wave 2 |
| GAP-04-002 | RT-04 | MEDIUM | OPEN | W2 | Wave 2 |
| GAP-05-001 | RT-05 | CRITICAL | OPEN | W2-03 | Wave 2 |
| GAP-05-002 | RT-05 | HIGH | OPEN | W3-02 | Wave 3 |
| GAP-05-003 | RT-05 | MEDIUM | OPEN | W2-03 | Wave 2 |
| GAP-06-001 | RT-06 | HIGH | OPEN | W2-10 | Wave 2 |
| GAP-06-002 | RT-06 | HIGH | OPEN | W2-10 | Wave 2 |
| GAP-06-003 | RT-06 | MEDIUM | OPEN | W2-10 | Wave 2 |
| GAP-06-004 | RT-06 | MEDIUM | OPEN | W2-10 | Wave 2 |
| GAP-07-001 | RT-07 | CRITICAL | OPEN | W2-01 | Wave 2 |
| GAP-07-002 | RT-07 | HIGH | OPEN | W2 (append-only enforcement) | Wave 2 |
| GAP-15-001 | RT-15 | CRITICAL | OPEN | W3-04 | Wave 3 |
| GAP-16-001 | RT-16 | CRITICAL | OPEN | W3-01 | Wave 3 |
| GAP-16-002 | RT-16 | CRITICAL | OPEN | W1-15 (types) + W3-01 (pipeline) | Waves 1+3 |
| GAP-PIPE-001 | All | CRITICAL | OPEN | W3-05 | Wave 3 |

**CRITICAL gap count: 8. All must reach RESOLVED before Gate 5.**

---

## PART 5 — KEY IMPLEMENTATION DECISIONS (IDR REGISTER)

| IDR ID | Status | Subject | Date |
|--------|--------|---------|------|
| IDR-001 | APPROVED | Path conflict resolved: `lib/constitutional-types/` is canonical; supersedes I0-ROADMAP path `lib/runtime/types/`. Filed: `decisions/IDR-001.md`. | 2026-07-25 |
| IDR-002 | APPROVED | Authority module structure: `lib/authority/` directory with `type-registry.js` (D6 §4.2–4.6 types), `authority-resolution.js` (delegation), `authority-resistance.js` (migrated from `lib/constitution/`). Filed: `decisions/IDR-002.md`. | 2026-07-25 |

**IDR-001 and IDR-002 approved. Gate 0 precondition satisfied. Required before Wave 2 W2-03.**

---

## PART 6 — CONSTITUTIONAL ERRATA WATCH LIST

Errata accepted into the frozen baseline that have implementation implications:

| Errata ID | Implementation Implication |
|-----------|---------------------------|
| C0-ERRATA-016A | RT-16 RS-13/RS-16 cites D7 §6.1; correct source is D7 Part 12. Pipeline implementation must derive from D7 Part 12, not RS-13/RS-16. |
| C0-ERRATA-010A | RT-10 RS-02 has §XI instead of §VII. No code impact but implementers reading RT-10 spec should use D-2 §VII. |
| C0-ERRATA-011A | RT-11 RS-11 labels `last_decision_ref` as CivilizationalDecision; correct is CivilizationalDecisionProposal. Implementers must use CivilizationalDecisionProposal for RT-11 state variable. |
| GS-07–GS-19 | Version reference updates in R1-R7 pending. Implementers using R1-R7 for type schemas should cross-check against A1-v1.2 for any PAIR references. |

---

## PART 7 — WAVE AND TASK COMPLETION RECORD

### Wave 0 — Preparation

| Field | Value |
|-------|-------|
| Status | COMPLETE |
| Entry Gate | Gate 0 PASSED 2026-07-25 |
| Exit Gate | Gate 1 PASSED 2026-07-25 |

| Task | Description | Status | Completion Date | Output Artifact |
|------|-------------|--------|----------------|-----------------|
| PWA-02 | Route Collision Resolution (OVL-001) | COMPLETE | 2026-07-25 | `routes/civilisation.js` DELETED; 15 routes migrated verbatim to `routes/civilization.js`; `server.js` single mount; OVL-001 RESOLVED; record: `decisions/PWA-02-ROUTE-COLLISION-RESOLUTION.md` |
| PWA-01 | Agent-System / Lib Boundary Declaration | COMPLETE | 2026-07-25 | `docs/constitutional-architecture/I0-AGENT-SYSTEM-BOUNDARY.md` CREATED (28.1K); 47 agent-system/ files classified (37 RETAIN, 3 ISOLATE, 1 MIGRATE); boundary rules OB-1 through OB-5; IC-1 through IC-7 |

---

### Wave 1 — Constitutional Object Type Introduction

| Field | Value |
|-------|-------|
| Status | **COMPLETE** |
| Unlocked By | Gate 1 PASSED 2026-07-25 |
| First Task | W1-01: Create `lib/constitutional-types/` directory and `index.js` skeleton |
| Last Task | W1-16: Constitutional Types Registry Completion — CERTIFIED 2026-07-27 |
| Exit Gate | Gate 2 (Core Object Model Established) — criteria satisfied; pending Implementation Owner PASS declaration |
| Blocking Note | RESOLVED — W1-16 COMPLETE. All 16 runtimes, 83 types, pattern conformance, DAG, registry integrity all certified. |

| Task | Description | Status | Completion Date | Output Artifact |
|------|-------------|--------|----------------|-----------------|
| W1-01 | Constitutional Object Type Foundation | COMPLETE | 2026-07-25 | `lib/constitutional-types/index.js` CREATED; stub registry; 83 types declared (0 defined); exports `{}`; SYNTAX_OK; record: `docs/constitutional-architecture/implementation/W1-01-CONSTITUTIONAL-TYPE-FOUNDATION-RECORD.md` |
| W1-02 | RT-01 Identity Type Definitions (Reference Implementation) | COMPLETE | 2026-07-25 | `lib/constitutional-types/identity-record.js` CREATED; 7 types defined (ActorProfile, ExternalReference, StructuralIdentityRecord, SemanticIdentityRecord, ReferentialIdentityRecord, IdentityConflictRecord, IdentityEndRecord); `index.js` updated; all 10 validations PASS; canonical type standard established; record: `docs/constitutional-architecture/implementation/W1-02-CONSTITUTIONAL-TYPE-REFERENCE-IMPLEMENTATION-RECORD.md` |
| W1-02A | Canonical Pattern Remediation (W1-GATE-A DEF-001 + DEF-002) | COMPLETE | 2026-07-25 | DEF-001: `lib/constitutional-types/_utils.js` CREATED; shared `_validate`/`_create` extracted; `identity-record.js` updated to require `_utils`; behavior unchanged. DEF-002: `index.js` collision-detecting `_register()` implemented; throws on duplicate export name, CONSTITUTIONAL.type, D8 canonical type number, or RUNTIME_ID; replaces Object.assign flat-merge. All validations PASS. W1-03 authorized. record: `docs/constitutional-architecture/implementation/W1-02A-CANONICAL-PATTERN-REMEDIATION.md` |
| W1-03 | RT-02 Authority Type Definitions | COMPLETE | 2026-07-25 | `lib/constitutional-types/authority-certificate.js` CREATED; 5 types defined (DelegationRecord, AuthorityClaim, AuthorityRevocationRecord, AuthorityConflictRecord, AuthorityScope); `index.js` updated with `_register('authority-certificate.js', authority.RUNTIME_ID, authority.TYPES)`; all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-03-AUTHORITY-TYPE-RECORD.md` |
| W1-04 | RT-05 Change/Reality Fabric Type Definitions | COMPLETE | 2026-07-25 | `lib/constitutional-types/change-record.js` CREATED; 4 types defined (ChangeRecord, HistoricalAnchor, FabricFoundingRoot, ObjectLifecycleRecord); `index.js` updated with `_register('change-record.js', change.RUNTIME_ID, change.TYPES)`; all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-04-REALITY-FABRIC-TYPE-RECORD.md` |
| W1-05 | RT-07 Memory/Historical State Type Definitions | COMPLETE | 2026-07-25 | `lib/constitutional-types/historical-state-record.js` CREATED; 4 types defined (HistoricalStateRecord, ProvenanceChain, MemoryLifecycleRecord, HistoricalStateQueryResult); `index.js` updated; all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-05-MEMORY-TYPE-RECORD.md` |
| W1-06 | RT-08 Observer Type Definitions | **COMPLETE** | 2026-07-26 | `lib/constitutional-types/observation-record.js` CREATED; 5 types defined (ObservationRecord, ObserverRegister, ObservationChannelRecord, ConsequenceObservationRecord, ObserverLimitationRecord); `index.js` updated with `_register('observation-record.js', observation.RUNTIME_ID, observation.TYPES)`; 47 total types in registry; IDR-003 Option A ownership note in ConsequenceObservationRecord CONSTITUTIONAL block; RT-08 boundary verified (no RT-07/RT-09/RT-14 types absorbed); all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-06-OBSERVATION-TYPE-RECORD.md` |
| W1-07 | RT-09 Epistemic Type Definitions | **COMPLETE** | 2026-07-26 | `lib/constitutional-types/knowledge-record.js` CREATED; 8 types defined (EvidenceObject, InterpretationRecord, BeliefObject, KnowledgeClaim, KnowledgeState, ContradictionRecord, RealityGapEntry, EpistemicProtocol); `index.js` updated with `_register('knowledge-record.js', knowledge.RUNTIME_ID, knowledge.TYPES)`; 55 total types in registry; DKS enum uses R9-canonical values (ACTIVE/UNCERTAIN/CONTESTED/DEGRADED) — wave plan discrepancy documented; RT-09 boundary verified (no RT-07/RT-08/RT-10/RT-11 types absorbed); all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-07-KNOWLEDGE-TYPE-RECORD.md` |
| W1-08 | RT-10 Domain Understanding Type Definitions | **COMPLETE** | 2026-07-26 | W1-08 CERTIFIED — 58 types; C-1 runtime name, C-2 file name, C-3 section number discrepancies documented |
| W1-09 | RT-11 Civilizational Understanding Type Definitions | **COMPLETE** | 2026-07-27 | W1-09 CERTIFIED — 65 types; D-1 section number, D-2 type set scope discrepancies documented |
| W1-10 | RT-12 Decision Type Definitions | **COMPLETE** | 2026-07-27 | W1-10 CERTIFIED — 70 types in registry; `lib/constitutional-types/civilizational-decision.js` CREATED; 5 types defined (CivilizationalDecision, OpenActionRegisterEntry, DecisionArchiveRecord, CivilizationalDecisionChainRecord, ComplianceVerificationRecord); `index.js` updated with `_register('civilizational-decision.js', decision.RUNTIME_ID, decision.TYPES)`; D-1 section-number, D-2 type-set scope, D-3 naming discrepancies documented; V-1 through V-14 PASS; FC-1 through FC-7 PASS; record: `docs/constitutional-architecture/implementation/W1-10-DECISION-TYPE-RECORD.md` |
| W1-11 | RT-13/RT-14 Action and Consequence Type Definitions | **COMPLETE** | 2026-07-27 | W1-11 CERTIFIED — 79 types; 5 RT-13 types (effect-expectation-record.js) + 4 RT-14 types (observed-consequence-record.js); D-1/D-2/D-3/D-4 discrepancies documented; V-1–V-16 PASS; FC-1–FC-7 DEFEATED; record: `docs/constitutional-architecture/implementation/W1-11-ACTION-CONSEQUENCE-TYPE-RECORD.md` |
| W1-12 | RT-06 Coherence Type Definitions | COMPLETE | 2026-07-25 | `lib/constitutional-types/coherence-violation-record.js` CREATED; 5 types defined (CoherenceViolationRecord, CoherenceResolutionEvent, CoherenceConflictRecord, CUMDegradationRecord, DomainCoherenceStatus); `index.js` updated with `_register('coherence-violation-record.js', coherence.RUNTIME_ID, coherence.TYPES)`; 25 total types in registry; all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-12-COHERENCE-TYPE-RECORD.md` |
| W1-13 | RT-03/RT-04 Kernel and Audit Type Definitions | COMPLETE | 2026-07-25 | `lib/constitutional-types/kernel-record.js` CREATED (RT-03: 5 types); `lib/constitutional-types/audit-record.js` CREATED (RT-04: 5 types); `index.js` updated with both `_register()` calls; 35 total types in registry; D6 AIR-5 independence preserved; all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-13-KERNEL-AUDIT-TYPE-RECORD.md` |
| W1-14 | RT-15 Domain Type Definitions | COMPLETE | 2026-07-26 | `lib/constitutional-types/domain-profile.js` CREATED; 7 types defined (DomainProfile, DomainAuthorityRecord, DomainActorProfileRegistry, DomainKnowledgeChain, DomainCoherenceAssessment, DomainFailureModeRecord, CrossDomainRelationshipRecord); `index.js` updated with `_register('domain-profile.js', domain.RUNTIME_ID, domain.TYPES)`; 42 total types in registry; cross-runtime ownership boundaries verified (RT-01, RT-02, RT-04 not absorbed); all 10 validations PASS; record: `docs/constitutional-architecture/implementation/W1-14-DOMAIN-TYPE-RECORD.md` |
| W1-15 | RT-16 Amendment Type Definitions | **COMPLETE** | 2026-07-27 | W1-15 CERTIFIED — 83 types total; 4 RT-16 types (amendment-proposal.js); D-1 discrepancy documented; V-1–V-16 PASS; FC-1–FC-7 DEFEATED; record: `docs/constitutional-architecture/implementation/W1-15-AMENDMENT-TYPE-RECORD.md` |
| W1-16 | Constitutional Types Registry Completion | **COMPLETE** | 2026-07-27 | W1-16 CERTIFIED — 83 types; 16 runtimes; Gate 2 criteria met; 3 TYPE C discrepancies (DOC-1, DOC-2, citation style); 7 FA challenges defeated; record: `docs/implementation/WAVE-1-CONSTITUTIONAL-COMPLETION-CERTIFICATION.md` |

**Wave 1 Downstream Dependency Map (IDR-003 → W1-06 chain):**

```
IDR-003 (RESOLVED 2026-07-26 — Option A)
    ↓ unblocked
W1-06 (RT-08 Observer) ← AUTHORIZED
    ↓
W1-07 (RT-09 Epistemic)
    ↓
W1-08 (RT-10 Understanding)
    ↓
W1-09 (RT-11 Civilizational)
   / \
W1-10  W1-15
(RT-12) (RT-16 amendments)
  ↓
W1-11 (RT-13/RT-14 Projection/Consequence)
    ↓
W1-16 (Registry Completion — final)
```

**Immediately authorized (parallel, no dependency on W1-06 chain):** W1-03, W1-04, W1-05, W1-12, W1-13, W1-14.

---

*End of I2-APEX-IMPLEMENTATION-LEDGER.md*
*Document ID: I2-LEDGER | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
*Initial State: All 16 runtimes UNCERTIFIED. All gates NOT_REACHED. 25 CRITICAL/HIGH gaps OPEN.*
*Last Synchronized: 2026-07-27 — Gate 0 PASSED, Gate 1 PASSED, IDR-001 APPROVED, IDR-002 APPROVED, IDR-003 RESOLVED (Option A; 2026-07-26), Wave 0 COMPLETE, Wave 1 COMPLETE (CERTIFIED 2026-07-27), W1-01 through W1-16 ALL COMPLETE. Registry: 83 types across 16 runtimes. Gate 2 criteria satisfied — pending Implementation Owner PASS declaration. Wave 2 BLOCKED pending Gate 2.*
