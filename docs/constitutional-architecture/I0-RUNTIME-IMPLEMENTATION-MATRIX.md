# I0 — RUNTIME IMPLEMENTATION MATRIX
## RT-01 through RT-16 — Constitutional Coverage Assessment

---

## MATRIX IDENTIFICATION

| Field | Value |
|-------|-------|
| Matrix ID | I0-MATRIX |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Source | Repository audit per I0-IMPLEMENTATION-BASELINE-AUDIT.md |

---

## COVERAGE LEGEND

| Status | Meaning |
|--------|---------|
| SUBSTANTIAL | Core functions implemented with database backing; production-viable |
| PARTIAL | Some functions implemented; key objects or boundaries missing |
| STUB | Architecture presence only; no functional implementation |
| MISSING | No implementation found; not referenced in codebase |

---

## RT-01 — IDENTITY RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.2 |
| Coverage % | 35% |
| Implementation Status | PARTIAL |
| Constitutional Name | Identity Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/memory/access-controller.js | 4-tier entity class hierarchy (FOUNDER/COUNCIL/SYSTEM/AGENT) | `const ENTITY_CLASSES = ['FOUNDER', 'COUNCIL', 'SYSTEM', 'AGENT']` |
| migrations/037_kernel_identity_tables.sql | humans + agents tables | `CREATE TABLE IF NOT EXISTS humans (id UUID PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001'...)` |
| lib/kernel.js | Kernel gate chain | `resolveIdentity → resolveOwnership → checkAuthority → checkGovernance` |
| lib/constitution/identity-continuity.js | Identity continuity enforcement | Constitution module |
| lib/constitution/identity-eligibility.js | Identity eligibility checking | Constitution module |
| lib/constitution/identity-firewall.js | Identity boundary enforcement | Constitution module |
| lib/constitution/meta-identity.js | Meta-identity layer | Constitution module |
| lib/registry/engine/ | Entity lookup and registration | `engine.lookup(req.params.id)` in routes/registry.js |

### Major Gaps
- No IdentityManifest object (constitutional RS-07)
- No IdentityRecord as a distinct managed object type
- No ObserverIdentityRecord
- humans table is single-user only (`DEFAULT '00000000-0000-4000-8000-000000000001'`) — constitutional architecture is multi-entity

### Dependencies
- RT-03 (Kernel) — identity is resolved in kernel gate chain

---

## RT-02 — AUTHORITY RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.3 |
| Coverage % | 30% |
| Implementation Status | PARTIAL |
| Constitutional Name | Authority Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/constitution/authority-resistance.js | Authority type enforcement | Called by constitutional-gate.js |
| lib/constitution/spec.js | AUTHORITY category (P01-P04) | `category: 'AUTHORITY'` principles |
| lib/runtime/constitutional-gate.js | Authority check stage | `_authorityTypeFromCtx(ctx)` → authority check |
| lib/app-auth.js | Application authentication | `router.use(require('../lib/app-auth'))` in all routes |
| lib/runtime/resource-authority-engine.js | Resource authority | `lib/intelligence/resource-authority-engine.js` |
| lib/constitution/identity-firewall.js | Authority boundary | Constitution module |

### Major Gaps
- No AuthorityCertificate object (constitutional RS-07)
- No AuthorityRegisterEntry as distinct object
- D6 §4.2-4.6 five authority types (AIR-1 through AIR-5) not implemented as distinct authority categories
- No formal authority derivation chain enforcement (D6 → A0 → A1 → runtime)
- Authority enforcement is implicit via kernel chain, not explicitly RT-02 managed

### Dependencies
- RT-01 (Identity) — authority resolution requires identity
- RT-03 (Kernel) — authority checked in kernel gate

---

## RT-03 — KERNEL RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.4 |
| Coverage % | 75% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Kernel Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/runtime/execution-transaction.js | PETL state machine | `PENDING → PREFLIGHT → COMMITTED → EXECUTING → FINALIZED/ABORTED` |
| lib/runtime/constitutional-gate.js | Pre-execution constitutional gate | Fail-CLOSED, 400ms timeout→DENY |
| lib/runtime/constitutional-preflight.js | PETL preflight | 350ms timeout; verdict mapping |
| lib/runtime/invariant-compiler.js | Invariant compilation | Stage 4 of PETL preflight |
| lib/runtime/concurrency-slot-manager.js | Concurrency control | Slot reservation/release |
| lib/runtime/governance-attestation.js | Governance gate | Stage 7 of PETL preflight |
| lib/runtime/governance-contract.js | Governance contracts | Execution contracts |
| lib/runtime/governance-compiler.js | Contract compilation | Governance compilation |
| lib/runtime/compensation-log.js | Compensation markers | On abort: compensation recorded |
| lib/runtime/rollback-manager.js (constitution/) | Rollback support | Constitution module |
| middleware/civilization-kernel.js | Kernel middleware pipeline | INIT→IDENTITY→CONSTITUTION→GOALS→ATTENTION→route→POST_HOOK |

**Functions (execution-transaction.js):** `begin(req, opts)`, `finalize(txId)`, `abort(txId, reason)`, `get(txId)`

**Transaction ID format:** `TX-{timestamp}-{sequence}-{hash}` (deterministic)

### Major Gaps
- Stage 10 Mandatory Propagation Window (MPW) not identified as explicit gate
- No KernelRecord type (constitutional RS-07)
- No explicit RT-05 ChangeRecord/HistoricalAnchor history query at Gate 6 (D4 §4.6)

### Dependencies
- RT-01 (Identity), RT-02 (Authority) — checked in PETL stages 1-2
- RT-04 (Audit) — all transactions logged
- RT-05 (Reality Fabric) — Gate 6 history check required

---

## RT-04 — AUDIT RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.5 |
| Coverage % | 65% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Audit Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/audit/decision_ledger.js | Append-only audit ledger | `record_execution_receipt()`; SHA-256 integrity hash |
| routes/governance.js | Governance forensics API; 16 forensic questions | `router.get('/governance/forensics/:taskId', ...)` |
| lib/runtime/governance-traceability.js | Full traceability chain | 11.1K |
| lib/runtime/governance-reproducibility.js | Reproducibility guarantees | ~5K |
| lib/runtime/execution-replay.js | Deterministic replay | 4.9K |
| lib/runtime/recorder-policy.js | Recording policy | 2.4K |
| lib/certification/execution_certification_engine.js | Execution certification | Certification engine |
| lib/certification/checker.js | Certification checking | Checker |
| lib/constitution/accountability-chain.js | Accountability chain | Constitution module |
| migrations/005_level9_governance.sql | 40-domain governance capability tables | 46.3K migration |

**Ledger fields:** receipt_id, execution_id, integrity_hash, grm_version, constitution_version, founder_decision, control_plane_snapshot, reality_snapshot, truth_signal

### Major Gaps
- No formal AuditRecord type (constitutional RS-07)
- AIR-5 (Audit Authority) not explicitly managed
- No explicit constitutional audit trail for all 16 runtimes (only execution-level auditing present)

---

## RT-05 — REALITY FABRIC RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.6 |
| Coverage % | 70% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Reality Fabric Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/reality/fabric.js | Reality Fabric orchestrator | 9.6K; `claimReality()`, `advanceClaim()`, `scoreRealityHealth()` |
| lib/reality/gates.js | Stage transition validation | 5.9K; confidence thresholds; dependency tracking |
| lib/reality/reality_loop.js | Reality loop | 9.7K |
| lib/reality/self-model.js | Self-model | 4.1K |
| lib/reality/projections/*.js | 5 projection modules | civilisation, governance, intelligence, memory, knowledge |
| routes/reality.js | Reality API | GET/POST /api/reality/claims; advance stage; health |
| routes/reality-architecture.js | Reality architecture API | Extended reality API |
| migrations/066_reality_fabric.sql | Database tables | reality_claims, claim_lifecycle_events, reality_health_scores |
| migrations/017_reality_convergence.sql | Earlier reality tables | 5.6K |

**Database Tables:** reality_claims, claim_lifecycle_events, reality_health_scores, claim_dependencies

### Major Gaps
- ChangeRecord and HistoricalAnchor objects (used in Gate 6 per D4 §4.6 / A1-v1.2 §12.1 Step 11) not identified as distinct RT-05 managed types
- No explicit Projection Boundary enforcement object
- Reality fabric API not integrated with PETL Gate 6 (kernel doesn't query reality_claims for Gate 6)

### Dependencies
- RT-03 (Kernel) — Gate 6 query required from RT-03

---

## RT-06 — COHERENCE RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.7 |
| Coverage % | 30% |
| Implementation Status | PARTIAL |
| Constitutional Name | Coherence Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/constitution/contradiction-manager.js | Contradiction detection | 6.5K; Constitution module |
| lib/constitution/deception-detector.js | Deception detection | 6.1K; Called by constitutional-gate.js |
| lib/constitution/confabulation-guard.js | Confabulation guard | 5.3K; Called by constitutional-gate.js |
| lib/constitution/blind-spot-discoverer.js | Blind spot discovery | 7.8K |
| lib/constitution/drift-detector.js | Constitutional drift | Constitution module |
| lib/constitution/drift-resistance.js | Drift resistance | Constitution module |
| lib/certification/checker.js | Certification checking | Coherence verification |
| lib/certification/execution_certification_engine.js | Execution certification | Coherence engine |
| lib/constitution/consensus-immunity.js | Consensus immunity | 6.7K |

### Major Gaps
- GCR-1 through GCR-7 (seven coherence dimensions from A0 §3.7) not implemented as named checks
- CoherenceViolationRecord (constitutional RS-07 owned object) table not found
- CRE (Coherence Register Entry) not identified
- CCR (Coherence Check Record) not identified
- DomainCoherenceStatus object not found
- RT-06 Stage 10 initiation signal (via RT-03 signal) not wired

### Dependencies
- RT-05 (Reality Fabric) — coherence evaluation reads RT-05 committed objects
- RT-03 (Kernel) — Stage 10 MPW signal triggers RT-06 evaluation

---

## RT-07 — MEMORY RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.8 |
| Coverage % | 70% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Memory Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/memory/gateway.js | Memory context assembly | 27.4K; getContext() assembles layers 0-11 |
| lib/memory/index.js | 13-layer memory export | All memory layers |
| lib/memory/working-memory.js | Layer 1: Working memory | TTL-based, session-scoped |
| lib/memory/episodic-memory-pg.js | Layer 2: Episodic | Durable task history (Postgres) |
| lib/memory/semantic-memory.js | Layer 3: Semantic | Validated facts, concepts, patterns |
| lib/memory/procedural-memory.js | Layer 4: Procedural | Playbooks, workflows |
| lib/memory/strategic-memory.js | Layer 5: Strategic | Goals, roadmaps |
| lib/memory/skill-memory.js | Layer 6: Skill | Competency metrics |
| lib/memory/decision-memory.js | Layer 7: Decision | Decisions, rationale, outcomes |
| lib/memory/knowledge-graph.js | Layer 8: Knowledge graph | Nodes, edges, confidence |
| lib/memory/consolidation-engine.js | Layer 10: Consolidation | raw→reflections→lessons→patterns→knowledge |
| lib/memory/reflexion-tracker.js | Layer 11: Reflexion | Lesson→behavior verification |
| lib/memory/improvement-engine.js | Layer 12: Improvement | Observation→deployment→validation |
| lib/memory/adaptation-cycle.js | Layer 13: Adaptation | Weekly behavior change cycle |
| lib/memory/access-controller.js | Auth | Layer permission enforcement |
| lib/memory/memory-governor.js | Gov | Memory governance |
| lib/intelligence/memory-retrieval-engine.js | Retrieval | 13.7K smart retrieval |
| lib/intelligence/memory-lifecycle-engine.js | Lifecycle | 8.5K lifecycle management |
| lib/constitution/memory-provenance.js | Provenance | Memory provenance tracking |
| lib/constitution/memory-trust-scorer.js | Trust | Memory trust scoring |
| lib/constitution/memory-immune-system.js | Immune | Memory immune system |
| migrations/009_memory_architecture.sql | Schema | 12 memory tables (22.2K) |
| routes/memory.js | API | Memory API |

### Major Gaps
- HistoricalStateRecord (constitutional owned object) not identified by name
- HistoricalStateQueryResult not identified by name (critical: needed for PETL Step 3)
- Append-only guarantee for memory records not verified at database level
- RT-07 integration with RT-08 (PAIR 28 — HistoricalStateQueryResult conditional at OPL Stage 2) not wired

### Dependencies
- RT-03 (Kernel) — PETL Step 3 Historical Contextualization requires HistoricalStateQueryResult
- RT-08 (Observation) — PAIR 28: RT-07 provides HistoricalStateQueryResult

---

## RT-08 — OBSERVATION RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.9 |
| Coverage % | 35% |
| Implementation Status | PARTIAL |
| Constitutional Name | Observation Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/observer-health/index.js | Sensor registry and calibration | `registerSensor()`, `recordCalibration()`, `getSensorHealth()` |
| migrations/067_observer_infrastructure.sql | Database tables | observer_registry, calibration_events, sensor_health_scores |
| lib/attention/attention-engine.js | Attention scoring | Observation-like attention computation |
| lib/attention/attention-manager.js | Attention management | Token budget per attention tier |
| routes/observatory.js | Observatory API | /api/observatory/* |

### Major Gaps
- ObservationRecord (constitutional RS-07 primary owned object) not identified
- ObserverRegister (constitutional RS-07) not mapped to observer_registry (naming mismatch)
- ObservationChannelRecord not identified
- ConsequenceObservationRecord not identified
- ObserverLimitationRecord not identified
- Observation Boundary (RF-A6: no external reality information enters except through valid ObservationRecord) not enforced as explicit gate
- RT-08 PRIMARY loop phase in Observation and Observation of Consequence (with RT-14) not wired

### Dependencies
- RT-07 (Memory) — PAIR 28: RT-07 provides HistoricalStateQueryResult
- RT-14 (Reflection) — PAIR 49: RT-08 and RT-14 jointly manage Observation of Consequence phase

---

## RT-09 — KNOWLEDGE RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.10 |
| Coverage % | 35% |
| Implementation Status | PARTIAL |
| Constitutional Name | Knowledge Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/intelligence/knowledge-validator.js | Knowledge validation | 11.9K |
| lib/intelligence/contradiction-engine.js | Contradiction detection | 14.4K |
| lib/intelligence/graph-reasoning-engine.js | Graph reasoning | 10.4K |
| lib/memory/knowledge-graph.js | Knowledge graph | Layer 8: nodes, edges |
| lib/memory/semantic-memory.js | Semantic facts | Layer 3 validated facts |
| lib/beliefs/index.js | Belief system | 5.3K |
| agent-system/langchain-rag.js | RAG pipeline | Knowledge retrieval augmentation |
| migrations/068_understanding_layer.sql | Understanding tables | understanding_scores, understanding_gaps |
| migrations/069_beliefs_layer.sql | Beliefs tables | beliefs schema |
| routes/knowledge-graph.js | Knowledge API | Knowledge graph routes |
| routes/cognitive.js | Cognitive API | RT-09 overlap |

### Major Gaps
- KnowledgeRecord (constitutional RS-07) not identified as distinct object type
- EvidenceRecord not identified
- KnowledgeConflictRecord not identified
- Evidence processing pipeline (ObservationRecord → evidence → KnowledgeRecord) not wired
- RT-09 PRIMARY loop phase (Knowledge phase) not explicitly modeled in codebase
- AIR-1 (Evidence domain) + AIR-2 (Evidence→Knowledge) authority types not mapped

### Dependencies
- RT-08 (Observation) — RT-09 receives ObservationRecords as evidence input
- RT-07 (Memory) — RT-09 writes to semantic memory

---

## RT-10 — INTELLIGENCE RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.11 |
| Coverage % | 60% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Intelligence Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/intelligence/sie.js | Strategic Intelligence Engine | 44.6K; Founder Graph + Memory + Opportunities + Threats → strategic guidance |
| lib/intelligence/civilization-health-engine.js | Civilization health | 17.8K |
| lib/intelligence/context-composer.js | Context composition | 9.7K |
| lib/intelligence/global-intelligence-engine.js | Global intelligence | 8.1K |
| lib/intelligence/organizational-learning-engine.js | Org learning | 16.5K |
| lib/intelligence/planning-influence-engine.js | Planning influence | 8.4K |
| lib/cognitive/index.js | 16 cognitive engines | meta-reasoning, autonomy, planning, execution, etc. |
| lib/understanding/index.js | Understanding layer | 5.3K |
| lib/understanding/theory-of-change.js | Theory of change | 3.4K |
| lib/intent/index.js | Intent layer | 3.6K |
| lib/cognitive/runtime/ | Runtime controllers | adaptive-router, autonomy-runtime, behavior-runtime, cognitive-feedback-loop |
| migrations/010_intelligence_layer.sql | Intelligence tables | 8.0K |
| migrations/011_cognitive_layer.sql | Cognitive tables | 11.9K |
| migrations/068_understanding_layer.sql | Understanding tables | understanding_scores, understanding_gaps |
| routes/intelligence.js | Intelligence API | /api/intelligence/* |
| routes/intelligence-memory.js | Intelligence-memory API | /api/intelligence-memory/* |

**SIE caching:** analysis 30min, briefing 6hr

### Major Gaps
- CUM (Comprehensive Understanding Model) not identified as explicit named object
- RT-10 PRIMARY loop phase (Understanding phase) not explicitly modeled
- Decision phase SUPPORTING characterization slightly overstated (see C0-ERRATA-010B from RT-10 spec FAA-10R-002)
- PAIR 32 (RT-10/RT-11 CUM validation during Deliberation) not wired

### Dependencies
- RT-09 (Knowledge) — RT-10 receives KnowledgeRecords as input
- RT-07 (Memory) — RT-10 reads and updates memory
- RT-11 (Civilization Intelligence) — RT-10 provides CUM to RT-11

---

## RT-11 — CIVILIZATION INTELLIGENCE RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.12 |
| Coverage % | 65% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Civilization Intelligence Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| civilisation/consensus.js | Multi-domain consensus protocol | SESSION_TYPES.CONSTITUTIONAL_AMENDMENT; 5-of-9 quorum; 48h expiry |
| civilisation/clock.js | Civilization clock | Tick rate per domain; drift detection |
| civilisation/domain-loader.js | Domain loading | DOM-000001 through DOM-000010 |
| civilisation/shadow-registry.js | Shadow registry | Per-domain registry projection |
| civilisation/genome-validator.js | Genome invariant validation | Advisory mode |
| civilisation/contract-validator.js | Contract validation | Advisory mode; phantom/orphan/mismatch detection |
| lib/intelligence/civilization-health-engine.js | Civilization health | 17.8K |
| lib/intelligence/civilization-runtime.js | Civilization runtime | 18.7K |
| lib/intelligence/executive-performance-engine.js | Executive performance | 18.6K |
| lib/intelligence/strategy-engine.js | Strategy engine | 9.6K |
| lib/intelligence/opportunity-engine.js | Opportunity analysis | 9.9K |
| lib/intelligence/value-creation-engine.js | Value creation | 5.5K |
| lib/reality/self-model.js | Self-model | 4.1K |
| middleware/civilization-kernel.js | Kernel middleware | INIT→IDENTITY→CONSTITUTION→GOALS→ATTENTION→route→POST_HOOK |
| routes/civilisation.js | Civilization API | /api/civilisation/status; /api/civilisation/domains; consensus |
| routes/civilization.js | Civilization API (duplicate) | Spelling variant; overlapping coverage |

### Major Gaps
- CivilizationalDecisionProposal (constitutional RS-07 primary owned object) not identified as distinct type
- Deliberation process not mapped to formal deliberation pipeline
- RT-11 PRIMARY loop phases (Deliberation, Decision, Updated Understanding) not explicitly wired
- FR-3 self-referential deliberation prohibition not enforced

### Dependencies
- RT-10 (Intelligence) — RT-11 receives CUM from RT-10
- RT-12 (Decision) — RT-11 delivers CivilizationalDecisionProposal to RT-12

---

## RT-12 — DECISION RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.13 |
| Coverage % | 55% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Decision Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/runtime/decision-lattice.js | Decision lattice | 9.7K |
| lib/runtime/decision-benchmark.js | Decision benchmarking | 6.4K |
| lib/runtime/decision-provenance.js | Decision lineage | 7.3K |
| lib/runtime/lattice-calibration-advisor.js | Calibration | 7.1K |
| lib/runtime/lattice-feedback-loop.js | Feedback loop | 5.3K |
| lib/runtime/lattice-health-signal.js | Health monitoring | 4.0K |
| lib/runtime/policy-experiment.js | Policy experimentation | ~4K |
| lib/intelligence/decision-intelligence.js | Decision intelligence | 6.6K |
| lib/intelligence/decision-outcome-engine.js | Decision outcome modeling | 4.5K |
| lib/memory/decision-memory.js | Decision memory | 7.6K |
| lib/audit/decision_ledger.js | Decision audit ledger | Append-only; SHA-256 hash |
| lib/constitution/escalation-controller.js | Escalation | Escalation governance |
| lib/constitution/course-corrector.js | Course correction | Decision correction |
| routes/governance.js | Governance/decision forensics | 16 forensic questions per task |

### Major Gaps
- CivilizationalDecision (constitutional RS-07 primary owned object) not identified as distinct managed object
- OpenActionRegisterEntry not identified
- DecisionArchiveRecord not identified
- CivilizationalDecisionChainRecord not identified
- Compliance verification gate (RT-12's role: validate CivilizationalDecisionProposal against authorities) not explicitly implemented
- AIR-2/Compliance authority type not mapped

### Dependencies
- RT-11 (Civilization Intelligence) — receives CivilizationalDecisionProposal
- RT-13 (Action) — delivers authorized CivilizationalDecision

---

## RT-13 — ACTION RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.14 |
| Coverage % | 55% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Action Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/runtime/execution-transaction.js | PETL execution commitment | COMMITTED→EXECUTING transition; action execution |
| lib/runtime/execution-context.js | Execution context | Context management |
| lib/runtime/execution-evaluator.js | Execution evaluation | Outcome assessment |
| lib/runtime/execution-replay.js | Deterministic replay | 4.9K |
| lib/runtime/concurrency-slot-manager.js | Concurrency slots | Parallel execution management |
| lib/reality/projections/civilisation.js | Civilisation projection | Reality projection for civilisation domain |
| lib/reality/projections/governance.js | Governance projection | Reality projection for governance |
| lib/reality/projections/intelligence.js | Intelligence projection | Reality projection |
| lib/reality/projections/memory.js | Memory projection | Reality projection |
| lib/reality/projections/knowledge.js | Knowledge projection | Reality projection |
| agent-system/orchestrator.js | Agent orchestration | Execution coordination |
| agent-system/master-orchestrator.js | Master orchestration | Multi-agent coordination |
| routes/agents.js | Agent API | /api/agents/* |

### Major Gaps
- EffectExpectationRecord (constitutional RS-07: informs RT-14) not identified as distinct type
- ProjectionRecord not identified
- Projection Boundary (constitutional: no unauthorized execution crossing) not explicitly enforced
- RT-13 PRIMARY loop phase (Action phase) not explicitly modeled
- AIR-4 (Projection/Outbound authority) not mapped
- Action → RT-08 notification (A0 §3.14 Responsibility 9: RT-08 always notified) not wired

### Dependencies
- RT-12 (Decision) — receives authorized CivilizationalDecision
- RT-05 (Reality Fabric) — commits projections to reality fabric
- RT-08 (Observation) — notifies RT-08 for consequence observation

---

## RT-14 — REFLECTION RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.15 |
| Coverage % | 55% |
| Implementation Status | SUBSTANTIAL |
| Constitutional Name | Reflection Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/runtime/outcome-registry.js | Outcome tracking | 12.2K |
| lib/runtime/outcome-lineage.js | Consequence chains | 10.6K |
| lib/runtime/execution-evaluator.js | Outcome assessment | 9.1K |
| lib/runtime/improvement-lab.js | Improvement | 6K |
| lib/runtime/learning-ledger.js | Learning ledger | 7K |
| lib/runtime/lattice-feedback-loop.js | Feedback loop | 5.3K |
| lib/memory/reflexion-tracker.js | Reflexion tracking | Closed-loop lesson→behavior |
| lib/memory/reflexion-ranker.js | Reflexion ranking | Lesson ranking |
| lib/memory/improvement-engine.js | Improvement engine | Layer 12 |
| lib/memory/adaptation-cycle.js | Adaptation cycle | Layer 13 |
| agent-system/reflection_agent.js | Reflection agent | Agent-system module |
| agent-system/reflection-engine.js | Reflection engine | Agent-system module |
| agent-system/self-evaluator.js | Self evaluation | Agent-system module |

### Major Gaps
- ConsequenceObservationRecord (constitutional RS-07) not identified as distinct named type
- RealityFeedbackRecord not identified
- RT-14 PRIMARY loop phase (Observation of Consequence) not explicitly wired to RT-08 pair
- DomainUpdateTrigger (sent to RT-15) not identified as distinct object

### Dependencies
- RT-08 (Observation) — receives consequence observations
- RT-13 (Action) — receives EffectExpectationRecords
- RT-15 (Domain) — delivers DomainUpdateTriggers

---

## RT-15 — DOMAIN RUNTIME (TWELVE INSTANCES)

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.16 |
| Coverage % | 50% |
| Implementation Status | PARTIAL |
| Constitutional Name | Domain Runtime (Twelve Instances) |

### Repository Locations

| File/Directory | Role | Evidence |
|----------------|------|----------|
| domains/civilisation/ | DOM-000001 | index.js, genome.yaml, src/runtime/, registry/ |
| domains/intelligence/ | DOM-000002 | Full domain structure |
| domains/registry/ | DOM-000003 | Full domain structure |
| domains/memory/ | DOM-000004 | Full domain structure |
| domains/infrastructure/ | DOM-000005 | Full domain structure |
| domains/observability/ | DOM-000006 | Full domain structure |
| domains/interface/ | DOM-000007 | Full domain structure |
| domains/knowledge/ | DOM-000008 | Full domain structure |
| domains/development/ | DOM-000009 | Full domain structure |
| domains/experiments/ | DOM-000010 | Full domain structure (autonomy_level:0) |
| civilisation/domain-loader.js | Domain loading | DOMAIN_MAP DOM-000001..DOM-000010 |
| civilisation/shadow-registry.js | Shadow registry | Per-domain registry projection |
| civilisation/genome-validator.js | Invariant validation | Advisory genome checks |
| civilisation/contract-validator.js | Contract validation | emit.yaml ↔ accept.yaml |
| lib/intelligence/civilization-runtime.js | Civilization runtime | 18.7K |

### CRITICAL GAP
**Constitutional spec requires 12 domain instances (DOM-000001 through DOM-000012). Repository implements 10 (DOM-000001 through DOM-000010). DOM-000011 and DOM-000012 are absent with no placeholder.**

### Major Gaps
- 2 domain instances missing (DOM-000011, DOM-000012)
- Domain failure modes (DF-1 through DF-8 per D6 Part 10) not identified by name in codebase
- DomainCoherenceStatus (produced for RT-06, RT-11) not identified as distinct object
- DomainUpdateTrigger (received from RT-14) not wired into domain instances

### Dependencies
- RT-14 (Reflection) — receives DomainUpdateTriggers
- RT-06 (Coherence) — receives DomainCoherenceStatus

---

## RT-16 — AMENDMENT RUNTIME

| Dimension | Value |
|-----------|-------|
| Constitutional Seat | A0-v1.1.1 §3.17 |
| Coverage % | 15% |
| Implementation Status | STUB |
| Constitutional Name | Amendment Runtime |

### Repository Locations

| File | Role | Evidence |
|------|------|----------|
| lib/constitution/amendments.json | Amendment store | `{"amendments":[], "latest_amendment_id":null}` |
| lib/constitution/baseline.json | Constitutional baseline | Baseline snapshot |
| civilisation/consensus.js | Consensus protocol | SESSION_TYPES.CONSTITUTIONAL_AMENDMENT; quorum 5-of-9 |
| lib/constitution/evolution-manager.js | Evolution management | Constitution module |
| lib/constitution/modification-governor.js | Modification governance | Called in constitutional gate for /modify paths |
| lib/runtime/constitutional-gate.js | Modification check | MOD_PATH_PATTERNS: /modify, /update-code, /self-modify, /patch, /rewrite |
| .constitution/laws/ | Constitutional laws | Data store |
| .constitution/hooks/ | Constitutional hooks | Hook definitions |

### Major Gaps
- AmendmentProposal object not implemented
- AmendmentRegistry not implemented
- RatifiedAmendmentRecord not implemented
- AmendmentRejectionRecord not implemented
- No amendment submission endpoint
- No amendment review/deliberation pipeline
- No Class I/II/III/IV amendment classification logic (D7 Part 12)
- No RT-16 15-step amendment execution order (A1 §12.8) implemented
- No Preservation Audit gate (PAIR 60 special authority)
- Human governance actor authorization for Class I amendments not implemented

### Dependencies
- RT-11 (Civilization Intelligence) — initiates amendment via PAIR 59
- RT-04 (Audit) — audit trail for all amendment decisions
- RT-15 (Domain) — domain deliberation participation

---

## SUMMARY TABLE

| Runtime | Constitutional Name | Status | Coverage % | Primary Gap |
|---------|-------------------|--------|------------|-------------|
| RT-01 | Identity Runtime | PARTIAL | 35% | No IdentityRecord/Manifest objects |
| RT-02 | Authority Runtime | PARTIAL | 30% | No AIR-1 through AIR-5 type enforcement |
| RT-03 | Kernel Runtime | SUBSTANTIAL | 75% | Gate 6 / Stage 10 MPW not wired |
| RT-04 | Audit Runtime | SUBSTANTIAL | 65% | No formal AuditRecord type |
| RT-05 | Reality Fabric Runtime | SUBSTANTIAL | 70% | ChangeRecord/HistoricalAnchor not explicit; Gate 6 not wired |
| RT-06 | Coherence Runtime | PARTIAL | 30% | GCR-1–7 not named; CoherenceViolationRecord missing |
| RT-07 | Memory Runtime | SUBSTANTIAL | 70% | HistoricalStateRecord/QueryResult not named |
| RT-08 | Observation Runtime | PARTIAL | 35% | ObservationRecord not formal; ObservationBoundary not enforced |
| RT-09 | Knowledge Runtime | PARTIAL | 35% | KnowledgeRecord not formal; evidence pipeline not wired |
| RT-10 | Intelligence Runtime | SUBSTANTIAL | 60% | CUM not explicit; loop phase not wired |
| RT-11 | Civilization Intelligence Runtime | SUBSTANTIAL | 65% | CivilizationalDecisionProposal not named |
| RT-12 | Decision Runtime | SUBSTANTIAL | 55% | CivilizationalDecision object not formal; compliance gate not explicit |
| RT-13 | Action Runtime | SUBSTANTIAL | 55% | EffectExpectationRecord not formal; RT-08 notification not wired |
| RT-14 | Reflection Runtime | SUBSTANTIAL | 55% | ConsequenceObservationRecord not formal; DomainUpdateTrigger not wired |
| RT-15 | Domain Runtime (12 Instances) | PARTIAL | 50% | 2 instances missing (DOM-000011, DOM-000012) |
| RT-16 | Amendment Runtime | STUB | 15% | Full amendment pipeline absent |

---

*End of I0-RUNTIME-IMPLEMENTATION-MATRIX.md*
*Matrix ID: I0-MATRIX | Date: 2026-07-25*
