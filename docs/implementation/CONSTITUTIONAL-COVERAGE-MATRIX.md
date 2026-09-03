# CONSTITUTIONAL-COVERAGE-MATRIX
## APEX — Master Constitutional Migration Dashboard

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | CONSTITUTIONAL-COVERAGE-MATRIX |
| Issuing Authority | Independent Constitutional Certification Authority |
| Date | 2026-07-27 |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Purpose | Complete matrix of constitutional adoption status per subsystem, per runtime, per type |

---

## PART 1 — ADOPTION STAGE DEFINITIONS

| Stage | Name | Definition |
|-------|------|------------|
| 0 | Legacy | Subsystem exists; no constitutional assessment performed |
| 1 | Type Coverage | Constitutional object types defined for this subsystem's runtime (Wave 1) |
| 2 | Ownership Mapping | Subsystem formally mapped to owning runtime; boundary declaration complete |
| 3 | Validation | Subsystem inputs/outputs validated against constitutional schemas |
| 4 | Execution | Subsystem emits and consumes formal constitutional type objects at runtime |
| 5 | Observability | Constitutional object emissions are observable, audited, and queryable |
| 6 | Certification | Subsystem has passed formal constitutional certification gate |
| 7 | Complete | Full constitutional compliance; all invariants enforced at runtime |

---

## PART 2 — SUBSYSTEM ADOPTION STAGE MATRIX

| Subsystem | Stage | % | Blocking Gaps | Wave Assignment |
|-----------|-------|---|--------------|-----------------|
| SS-01 Constitutional Types | 2 | 25% | Not wired to any production code | Wave 2 (wiring target) |
| SS-02 Pre-Constitutional Constitution | 1 | 14% | No formal type emission; verify() not → typed records | Wave 2 PRIMARY |
| SS-03 PETL | 1 | 14% | begin()/abort() not → KernelOperationManifest/RejectionRecord | Wave 2 (W2-02) |
| SS-04 Constitutional Gate | 1 | 14% | evaluate() verdict not → ConstitutionalAuditRecord | Wave 2 |
| SS-05 Governance Attestation | 1 | 14% | Attestation not → ConstitutionalComplianceAttestation | Wave 2 |
| SS-06 Reality Fabric | 1 | 14% | claimReality() not → ObservationRecord | Wave 2 |
| SS-07 Civilizational Consensus | 1 | 14% | consensus sessions not → DeliberationRecord/AmendmentProposal | Wave 2 |
| SS-08 Memory Architecture | 1 | 14% | No HistoricalStateRecord production; gateway missing getHistoricalState() | Wave 2 (W2-01) |
| SS-09 Intelligence | 1 | 14% | knowledge-validator not → KnowledgeRecord | Wave 2 |
| SS-10 Cognitive | 1 | 14% | No constitutional type emission | Wave 2/3 |
| SS-11 Agent System | 0 | 0% | Explicitly deferred to Wave 4 | Wave 4 |
| SS-12 Governance (lib/governance.js) | 0→1 | 5% | 40-domain model vs 16-runtime model unresolved | Wave 2/3 |
| SS-13 Audit System | 1 | 14% | decision_ledger not → ConstitutionalAuditRecord | Wave 2 |
| SS-14 Observer/Health | 1 | 14% | Health observations not → ObservationRecord | Wave 2/3 |
| SS-15 Founder/Identity | 1 | 14% | Founder profile not → ActorProfile (RT-01) | Wave 2 |
| SS-16 Domain/Empire | 1 | 14% | Domain data not → DomainProfile (RT-15) | Wave 3 |
| SS-17 Route Layer | 1 | 14% | 44 routes — none emit constitutional types | Wave 2/3 |
| SS-18 Middleware | 1 | 14% | civilization-kernel.js not → typed constitutional records | Wave 2 |
| SS-19 Database | 1 | 14% | No constitutional type tables in schema | Wave 2 (migrations) |
| SS-20 Cron/Scheduler | 0 | 0% | No constitutional assessment; deferred | Wave 3 |
| SS-21 Server Entry | 1 | 14% | No KernelOperationManifest on boot | Wave 2 |
| SS-22 lib/beliefs | 0 | 0% | Not assessed | Wave 3 |
| SS-22 lib/certification | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/council | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/evolution | 1 | 14% | Types exist; wiring deferred | Wave 2 |
| SS-22 lib/integrity | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/learning | 1 | 14% | Types exist; wiring deferred | Wave 2 |
| SS-22 lib/orchestration | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/state | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/telemetry | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/temporal | 0 | 0% | Not assessed | Wave 2 |
| SS-22 lib/understanding | 0 | 0% | Not assessed | Wave 2/3 |

---

## PART 3 — RUNTIME COVERAGE MATRIX

For each constitutional runtime (RT-01 through RT-16): what subsystems relate to it, what types are defined, what operational code maps to it, and what is missing.

### RT-01 — Identity and Actor Registration Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | ActorProfile, ExternalReference, StructuralIdentityRecord, SemanticIdentityRecord, ReferentialIdentityRecord, IdentityConflictRecord, IdentityEndRecord |
| Operational Code | PARTIAL | lib/founder/profile.js (actor profiles, pre-constitutional); lib/entities/ |
| Production Emission | NONE | No code emits ActorProfile or identity records as formal typed objects |
| Database Backing | NONE | No migration for constitutional identity tables |
| Key Gap | lib/founder/profile.js → ActorProfile(RT-01) mapping not wired |
| Wave 2 Priority | MEDIUM |
| Stage | 1 |

### RT-02 — Authority Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | DelegationRecord, AuthorityClaim, AuthorityRevocationRecord, AuthorityConflictRecord, AuthorityScope |
| Operational Code | PARTIAL | lib/constitution/authority-resistance.js; lib/runtime/governance-contract.js |
| Production Emission | NONE | authority-resistance.js produces verdicts but not AuthorityClaim typed objects |
| Key Gap | Authority claims in constitutional-gate.js not emitted as AuthorityClaim records |
| Wave 2 Priority | MEDIUM |
| Stage | 1 |

### RT-03 — Constitutional Enforcement Kernel Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | RejectionRecord, AccountabilityRecord, RollbackProvenanceRecord, SuspensionNotice, KernelOperationManifest |
| Operational Code | STRONG | lib/runtime/execution-transaction.js (PETL); lib/runtime/constitutional-gate.js; middleware/civilization-kernel.js |
| Production Emission | NONE | PETL begin()/abort() not wrapped in KernelOperationManifest/RejectionRecord |
| Key Gap | W2-02 (PETL Step 2 fix) is the direct resolution; highest priority Wave 2 task |
| Wave 2 Priority | CRITICAL (on Wave 2 critical path) |
| Stage | 1 |

### RT-04 — Constitutional Governance Audit Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | ConstitutionalAuditRecord, ConstitutionalComplianceAttestation, ConstitutionalViolationRecord, AuditScope, PreservationAuditRecord |
| Operational Code | GOOD | lib/runtime/governance-attestation.js; lib/audit/decision_ledger.js |
| Production Emission | NONE | governance-attestation.js produces coverage/integrity hashes but not ConstitutionalComplianceAttestation |
| Key Gap | Audit events not wrapped in ConstitutionalAuditRecord |
| Wave 2 Priority | HIGH |
| Stage | 1 |

### RT-05 — Reality Fabric Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | ChangeRecord, HistoricalAnchor, FabricFoundingRoot, ObjectLifecycleRecord |
| Operational Code | GOOD | lib/governance.js (records operational changes to Supabase); lib/evolution/ |
| Production Emission | NONE | governance.js writes to Supabase but not as ChangeRecord typed objects |
| Key Gap | W2-03 (ChangeRecord on fabric.js) directly addresses this |
| Wave 2 Priority | HIGH (on Wave 2 critical path) |
| Stage | 1 |

### RT-06 — Coherence Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | CoherenceViolationRecord, CoherenceResolutionEvent, CoherenceConflictRecord, CUMDegradationRecord, DomainCoherenceStatus |
| Operational Code | PARTIAL | lib/constitution/drift-detector.js; lib/constitution/drift-resistance.js; lib/constitution/drift-surveillance.js; lib/integrity/ |
| Production Emission | NONE | Drift detection produces verdicts but not CoherenceViolationRecord typed objects |
| Verification Note | R-04: structural_immutable flag value should be verified against R06-spec before wiring |
| Wave 2 Priority | MEDIUM (W2-10 on Wave 2 critical path) |
| Stage | 1 |

### RT-07 — Memory Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | HistoricalStateRecord, ProvenanceChain, MemoryLifecycleRecord, HistoricalStateQueryResult |
| Operational Code | GOOD | lib/memory/gateway.js; lib/memory/working-memory.js; lib/state/; lib/temporal/ |
| Production Emission | NONE | gateway.js has no getHistoricalState() returning HistoricalStateQueryResult |
| Key Gap | W2-01 directly adds getHistoricalState() → first Wave 2 task |
| Wave 2 Priority | CRITICAL (first Wave 2 task; unblocks W2-02) |
| Stage | 1 |

### RT-08 — Observation Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | ObservationRecord, ObserverRegister, ObservationChannelRecord, ConsequenceObservationRecord, ObserverLimitationRecord |
| Operational Code | GOOD | lib/reality/fabric.js (13-stage); lib/observer-health/; routes/observatory.js |
| Production Emission | NONE | fabric.js creates rich claim records but not ObservationRecord typed objects |
| Architectural Tension | 13-stage fabric lifecycle vs RT-08 ObservationRecord lifecycle — must decide: map OR treat as substrate+summary |
| Wave 2 Priority | HIGH |
| Stage | 1 |

### RT-09 — Knowledge Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | EvidenceObject, InterpretationRecord, BeliefObject, KnowledgeClaim, KnowledgeState, ContradictionRecord, RealityGapEntry, EpistemicProtocol |
| Operational Code | GOOD | lib/intelligence/knowledge-validator.js; lib/intelligence/contradiction-engine.js; lib/beliefs/; lib/epistemic-capital/; lib/mental-models/ |
| Production Emission | NONE | No knowledge validation outputs wrapped in KnowledgeRecord or EvidenceObject |
| Wave 2 Priority | HIGH (W2-07 on wave plan) |
| Stage | 1 |

### RT-10 — Intelligence Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | DomainUnderstandingModel, InferenceProtocol, UnderstandingDegradationFlag |
| Operational Code | GOOD | lib/cognitive/ (14+ engines); lib/intelligence/; lib/understanding/ |
| Production Emission | NONE | Cognitive reasoning produces no DomainUnderstandingModel typed outputs |
| Verification Note | R-05: structural_immutable flag should be verified against R10-spec before wiring |
| Wave 2 Priority | MEDIUM |
| Stage | 1 |

### RT-11 — Civilization Intelligence Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | CivilizationUnderstandingModel, DeliberationRecord, CausalModel, AssumptionRegister, StrategicPlan, CivilizationCoherenceState, CivilizationalDecisionProposal |
| Operational Code | STRONG | civilisation/consensus.js; lib/civilization/; lib/council/; lib/goals/; lib/intent/ |
| Production Emission | NONE | consensus.js sessions not wrapped in DeliberationRecord |
| Key Gap | Consensus PENDING/APPROVED lifecycle not mapped to CivilizationalDecisionProposal lifecycle |
| Wave 2 Priority | HIGH |
| Stage | 1 |

### RT-12 — Decision Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | CivilizationalDecision, OpenActionRegisterEntry, DecisionArchiveRecord, CivilizationalDecisionChainRecord, ComplianceVerificationRecord |
| Operational Code | GOOD | lib/runtime/decision-lattice.js; lib/runtime/decision-provenance.js; lib/runtime/decision-benchmark.js; routes/civilization.js |
| Production Emission | NONE | decision-lattice.js produces verdicts but not CivilizationalDecision typed objects |
| Finding | ComplianceVerificationRecord authority field cites I2 wave plan (F-02) — requires correction |
| Wave 2 Priority | HIGH |
| Stage | 1 |

### RT-13 — Action Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | ActionProjection, EffectExpectationRecord, IrreversibilityClassificationRecord, ProjectionResponsibilityRecord, ProjectionBoundaryCrossingRecord |
| Operational Code | PARTIAL | lib/runtime/execution-evaluator.js; lib/runtime/execution-context.js; lib/simulation/; lib/counterfactual/ |
| Production Emission | NONE | Execution evaluation not wrapped in ActionProjection or EffectExpectationRecord |
| Wave 2 Priority | MEDIUM-LOW (Wave 2 secondary path; W2-05) |
| Stage | 1 |

### RT-14 — Reflection Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | ObservedConsequenceRecord, CausalModelDivergenceRecord, OpenActionRegisterTerminalStatusRecord, ReflectionTriggerRecord |
| Operational Code | PARTIAL | lib/runtime/outcome-registry.js; lib/runtime/outcome-lineage.js; agent-system/reflection_agent.js |
| Production Emission | NONE | Outcome registry records not typed as ObservedConsequenceRecord |
| Wave 2 Priority | MEDIUM (depends on RT-13 first) |
| Stage | 1 |

### RT-15 — Domain Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | DomainProfile, DomainAuthorityRecord, DomainActorProfileRegistry, DomainKnowledgeChain, DomainCoherenceAssessment, DomainFailureModeRecord, CrossDomainRelationshipRecord |
| Operational Code | GOOD | lib/empire/; lib/ministry/; lib/finance/; lib/economics/ |
| Production Emission | NONE | Empire domain data not typed as DomainProfile |
| Verification Note | R-05: structural_immutable flag should be verified against R15-spec before wiring |
| Wave 2 Priority | MEDIUM (Wave 2 secondary; W2-06) |
| Stage | 1 |

### RT-16 — Amendment Runtime

| Dimension | Status | Detail |
|-----------|--------|--------|
| Types Defined | COMPLETE | AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord, AmendmentRejectionRecord |
| Operational Code | MINIMAL | civilisation/amendments.json (450B stub); civilisation/consensus.js (broader scope) |
| Production Emission | NONE | No amendment process emits AmendmentProposal typed objects |
| Key Gap | The pre-constitutional amendment mechanism (amendments.json + consensus.js) is not connected to RT-16 types |
| Wave 2 Priority | LOW (event-driven; dormant until amendment needed; Wave 3 pipeline) |
| Stage | 1 |

---

## PART 4 — CONSTITUTIONAL OBJECT TYPE COVERAGE MATRIX

For each of the 83 constitutional object types: current coverage status.

**Legend:**
- ✓ = Present and correct
- ~ = Partial or indirect
- ✗ = Missing
- → = What will produce this type (Wave 2+)

| Type | Runtime | Defined | Wired | Emitted | DB Backed | Wave 2 Producer |
|------|---------|---------|-------|---------|-----------|-----------------|
| **RT-01 Identity** | | | | | | |
| ActorProfile | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/founder/profile.js |
| ExternalReference | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/entities/ |
| StructuralIdentityRecord | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/constitution/identity-continuity.js |
| SemanticIdentityRecord | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/constitution/identity-continuity.js |
| ReferentialIdentityRecord | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/constitution/identity-continuity.js |
| IdentityConflictRecord | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/constitution/identity-firewall.js |
| IdentityEndRecord | RT-01 | ✓ | ✗ | ✗ | ✗ | lib/constitution/identity-continuity.js |
| **RT-02 Authority** | | | | | | |
| DelegationRecord | RT-02 | ✓ | ✗ | ✗ | ✗ | lib/constitution/authority-resistance.js |
| AuthorityClaim | RT-02 | ✓ | ✗ | ✗ | ✗ | lib/runtime/constitutional-gate.js |
| AuthorityRevocationRecord | RT-02 | ✓ | ✗ | ✗ | ✗ | lib/constitution/authority-resistance.js |
| AuthorityConflictRecord | RT-02 | ✓ | ✗ | ✗ | ✗ | lib/constitution/arbitrator.js |
| AuthorityScope | RT-02 | ✓ | ✗ | ✗ | ✗ | lib/constitution/authority-resistance.js |
| **RT-03 Kernel** | | | | | | |
| RejectionRecord | RT-03 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-transaction.js abort() |
| AccountabilityRecord | RT-03 | ✓ | ✗ | ✗ | ✗ | lib/constitution/accountability-chain.js |
| RollbackProvenanceRecord | RT-03 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-replay.js |
| SuspensionNotice | RT-03 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-transaction.js |
| KernelOperationManifest | RT-03 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-transaction.js begin() |
| **RT-04 Audit** | | | | | | |
| ConstitutionalAuditRecord | RT-04 | ✓ | ✗ | ✗ | ✗ | lib/audit/decision_ledger.js |
| ConstitutionalComplianceAttestation | RT-04 | ✓ | ✗ | ✗ | ✗ | lib/runtime/governance-attestation.js |
| ConstitutionalViolationRecord | RT-04 | ✓ | ✗ | ✗ | ✗ | lib/runtime/constitutional-gate.js (DENY) |
| AuditScope | RT-04 | ✓ | ✗ | ✗ | ✗ | lib/runtime/governance-manifest.js |
| PreservationAuditRecord | RT-04 | ✓ | ✗ | ✗ | ✗ | lib/audit/ |
| **RT-05 Reality Fabric** | | | | | | |
| ChangeRecord | RT-05 | ✓ | ✗ | ✗ | ✗ | lib/governance.js → W2-03 target |
| HistoricalAnchor | RT-05 | ✓ | ✗ | ✗ | ✗ | lib/reality/fabric.js |
| FabricFoundingRoot | RT-05 | ✓ | ✗ | ✗ | ✗ | Server startup sequence |
| ObjectLifecycleRecord | RT-05 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-transaction.js |
| **RT-06 Coherence** | | | | | | |
| CoherenceViolationRecord | RT-06 | ✓ | ✗ | ✗ | ✗ | lib/constitution/drift-detector.js |
| CoherenceResolutionEvent | RT-06 | ✓ | ✗ | ✗ | ✗ | lib/constitution/course-corrector.js |
| CoherenceConflictRecord | RT-06 | ✓ | ✗ | ✗ | ✗ | lib/constitution/invariant-conflict-resolver.js |
| CUMDegradationRecord | RT-06 | ✓ | ✗ | ✗ | ✗ | lib/cognitive/cognitive-evolution-engine.js |
| DomainCoherenceStatus | RT-06 | ✓ | ✗ | ✗ | ✗ | lib/reality/fabric.js health scoring |
| **RT-07 Memory** | | | | | | |
| HistoricalStateRecord | RT-07 | ✓ | ✗ | ✗ | ✗ | lib/memory/gateway.js → W2-01 |
| ProvenanceChain | RT-07 | ✓ | ✗ | ✗ | ✗ | lib/memory/memory-governor.js |
| MemoryLifecycleRecord | RT-07 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/memory-lifecycle-engine.js |
| HistoricalStateQueryResult | RT-07 | ✓ | ✗ | ✗ | ✗ | lib/memory/gateway.js → W2-01 |
| **RT-08 Observation** | | | | | | |
| ObservationRecord | RT-08 | ✓ | ✗ | ✗ | ✗ | lib/reality/fabric.js claimReality() |
| ObserverRegister | RT-08 | ✓ | ✗ | ✗ | ✗ | lib/constitution/observation-registry.js |
| ObservationChannelRecord | RT-08 | ✓ | ✗ | ✗ | ✗ | lib/observer-health/ |
| ConsequenceObservationRecord | RT-08 | ✓ | ✗ | ✗ | ✗ | lib/runtime/outcome-registry.js |
| ObserverLimitationRecord | RT-08 | ✓ | ✗ | ✗ | ✗ | lib/constitution/epistemic-auditor.js |
| **RT-09 Knowledge** | | | | | | |
| EvidenceObject | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/knowledge-validator.js |
| InterpretationRecord | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/context-composer.js |
| BeliefObject | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/beliefs/ |
| KnowledgeClaim | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/knowledge-validator.js |
| KnowledgeState | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/decision-intelligence.js |
| ContradictionRecord | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/contradiction-engine.js |
| RealityGapEntry | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/reality/fabric.js (contested claims) |
| EpistemicProtocol | RT-09 | ✓ | ✗ | ✗ | ✗ | lib/constitution/epistemic-humility.js |
| **RT-10 Intelligence** | | | | | | |
| DomainUnderstandingModel | RT-10 | ✓ | ✗ | ✗ | ✗ | lib/cognitive/ + lib/understanding/ |
| InferenceProtocol | RT-10 | ✓ | ✗ | ✗ | ✗ | lib/cognitive/reasoning-strategy-engine.js |
| UnderstandingDegradationFlag | RT-10 | ✓ | ✗ | ✗ | ✗ | lib/cognitive/cognitive-performance-engine.js |
| **RT-11 Civilization Intelligence** | | | | | | |
| CivilizationUnderstandingModel | RT-11 | ✓ | ✗ | ✗ | ✗ | lib/civilization/domain-scorer.js |
| DeliberationRecord | RT-11 | ✓ | ✗ | ✗ | ✗ | civilisation/consensus.js |
| CausalModel | RT-11 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/graph-reasoning-engine.js |
| AssumptionRegister | RT-11 | ✓ | ✗ | ✗ | ✗ | lib/constitution/meta-uncertainty.js |
| StrategicPlan | RT-11 | ✓ | ✗ | ✗ | ✗ | lib/strategic-planning-engine.js |
| CivilizationCoherenceState | RT-11 | ✓ | ✗ | ✗ | ✗ | lib/reality/self-model.js |
| CivilizationalDecisionProposal | RT-11 | ✓ | ✗ | ✗ | ✗ | civilisation/consensus.js (proposal initiation) |
| **RT-12 Decision** | | | | | | |
| CivilizationalDecision | RT-12 | ✓ | ✗ | ✗ | ✗ | lib/runtime/decision-lattice.js |
| OpenActionRegisterEntry | RT-12 | ✓ | ✗ | ✗ | ✗ | lib/runtime/outcome-registry.js |
| DecisionArchiveRecord | RT-12 | ✓ | ✗ | ✗ | ✗ | lib/audit/decision_ledger.js |
| CivilizationalDecisionChainRecord | RT-12 | ✓ | ✗ | ✗ | ✗ | lib/runtime/decision-provenance.js |
| ComplianceVerificationRecord | RT-12 | ✓ | ✗ | ✗ | ✗ | lib/runtime/decision-lattice.js Gate 5 |
| **RT-13 Action** | | | | | | |
| ActionProjection | RT-13 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-evaluator.js |
| EffectExpectationRecord | RT-13 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-evaluator.js |
| IrreversibilityClassificationRecord | RT-13 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-evaluator.js |
| ProjectionResponsibilityRecord | RT-13 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-evaluator.js |
| ProjectionBoundaryCrossingRecord | RT-13 | ✓ | ✗ | ✗ | ✗ | lib/runtime/execution-evaluator.js |
| **RT-14 Reflection** | | | | | | |
| ObservedConsequenceRecord | RT-14 | ✓ | ✗ | ✗ | ✗ | lib/runtime/outcome-registry.js |
| CausalModelDivergenceRecord | RT-14 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/contradiction-engine.js |
| OpenActionRegisterTerminalStatusRecord | RT-14 | ✓ | ✗ | ✗ | ✗ | lib/runtime/outcome-registry.js |
| ReflectionTriggerRecord | RT-14 | ✓ | ✗ | ✗ | ✗ | lib/runtime/outcome-lineage.js |
| **RT-15 Domain** | | | | | | |
| DomainProfile | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/empire/ |
| DomainAuthorityRecord | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/empire/ |
| DomainActorProfileRegistry | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/empire/ + lib/founder/ |
| DomainKnowledgeChain | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/intelligence/knowledge-validator.js |
| DomainCoherenceAssessment | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/reality/fabric.js health scoring |
| DomainFailureModeRecord | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/constitution/cascade-failure-detector.js |
| CrossDomainRelationshipRecord | RT-15 | ✓ | ✗ | ✗ | ✗ | lib/empire/graph.js |
| **RT-16 Amendment** | | | | | | |
| AmendmentProposal | RT-16 | ✓ | ✗ | ✗ | ✗ | civilisation/consensus.js (amendment sessions) |
| AmendmentRegistry | RT-16 | ✓ | ✗ | ✗ | ✗ | civilisation/consensus.js |
| RatifiedAmendmentRecord | RT-16 | ✓ | ✗ | ✗ | ✗ | civilisation/consensus.js (APPROVED state) |
| AmendmentRejectionRecord | RT-16 | ✓ | ✗ | ✗ | ✗ | civilisation/consensus.js (REJECTED/EXPIRED state) |

**Summary:** 83/83 types DEFINED. 0/83 types WIRED. 0/83 types EMITTED in production. 0/83 types DB BACKED with constitutional schemas.

---

## PART 5 — AGGREGATE COVERAGE METRICS

| Metric | Count | Percentage |
|--------|-------|------------|
| Types defined | 83 | 100% |
| Types wired (production code emits them) | 0 | 0% |
| Types with DB backing (constitutional tables) | 0 | 0% |
| Subsystems at Stage 0 (Legacy) | ~8 | ~25% |
| Subsystems at Stage 1 (Type Coverage only) | ~23 | ~70% |
| Subsystems at Stage 2+ | 0 | 0% |
| Runtimes with operational implementation | 16 | 100% |
| Runtimes with production type emission | 0 | 0% |

**Current constitutional adoption level: Stage 1 globally.** All 16 runtimes have type definitions. No runtime has production type emission. Wave 2 moves from Stage 1 → Stage 4 for the highest-priority runtimes.

---

*Document produced by Independent Constitutional Certification Authority.*
*Date: 2026-07-27. Baseline: APEX-CONSTITUTION-v1.0.*
