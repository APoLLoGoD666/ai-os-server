# I0 — IMPLEMENTATION GAP REGISTER
## Every Missing Constitutional Implementation — Grouped by Runtime

---

## REGISTER IDENTIFICATION

| Field | Value |
|-------|-------|
| Register ID | I0-GAPS |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Source | I0-RUNTIME-IMPLEMENTATION-MATRIX.md + I0-IMPLEMENTATION-BASELINE-AUDIT.md |

---

## SEVERITY LEGEND

| Severity | Meaning |
|----------|---------|
| CRITICAL | Blocks constitutional compliance; the constitutional architecture cannot function correctly without this |
| HIGH | Material capability gap; a runtime cannot perform its primary constitutional function |
| MEDIUM | Secondary function missing; runtime is operational but incomplete |
| LOW | Refinement; runtime functions but lacks constitutional precision |

## COMPLEXITY LEGEND

| Complexity | Meaning |
|------------|---------|
| S (Small) | ≤1 day; a new object type, schema field, or wire-up of existing code |
| M (Medium) | 2–5 days; new module with database backing |
| L (Large) | 1–2 weeks; new subsystem integrating multiple existing components |
| XL (Extra Large) | 2–4 weeks; new pipeline across multiple runtimes |

---

## RT-01 — IDENTITY RUNTIME GAPS

### GAP-01-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-01-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-03-001 (Kernel IdentityRecord query) |
| Constitutional Requirement | RS-07: IdentityRecord is the primary owned object of RT-01 |
| Current State | Identity is inferred from entity class (FOUNDER/COUNCIL/SYSTEM/AGENT) via access-controller.js; no discrete IdentityRecord object type |
| Required | Formal IdentityRecord object with constitutional parameters; registration mechanism; unique identity assertions |
| Files | lib/memory/access-controller.js; migrations/037_kernel_identity_tables.sql |

### GAP-01-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-01-002 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: IdentityManifest — configuration bundle for a runtime identity |
| Current State | No IdentityManifest object or schema |
| Required | IdentityManifest schema and management |
| Files | New: lib/identity/manifest.js |

### GAP-01-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-01-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | Multi-entity support; A0 §3.2 RT-01 manages all entity identities in the system |
| Current State | humans table defaults to single row (`DEFAULT '00000000-0000-4000-8000-000000000001'`); single-user architecture |
| Required | Multi-entity identity support for constitutional multi-runtime architecture |
| Files | migrations/037_kernel_identity_tables.sql |

---

## RT-02 — AUTHORITY RUNTIME GAPS

### GAP-02-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-02-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-03-002 |
| Constitutional Requirement | D6 §4.2-4.6: Five authority types (AIR-1: Observation, AIR-2: Interpretation/Compliance, AIR-3: Amendment, AIR-4: Projection/Outbound, AIR-5: Audit) |
| Current State | lib/constitution/authority-resistance.js enforces authority conceptually but does not implement the five-type AIR taxonomy |
| Required | Authority type registry mapping each runtime to its AIR-N type(s) per A1-v1.2 §5.1 |
| Files | lib/constitution/authority-resistance.js; new: lib/authority/type-registry.js |

### GAP-02-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-02-002 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-02-001 |
| Constitutional Requirement | RS-07: AuthorityCertificate — formal authority grant object |
| Current State | No AuthorityCertificate object; authority is implicit in kernel gate pass |
| Required | AuthorityCertificate as formal object produced by RT-02 and consumed by RT-03 |
| Files | New: lib/authority/certificate.js |

### GAP-02-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-02-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | GAP-02-001 |
| Constitutional Requirement | D6 §4.7 Authority Integrity Rules (AIR-1 through AIR-5 as rules) explicitly distinguished from §4.2-4.6 authority types |
| Current State | R8-v1.1 resolved this distinction; but it is not enforced at the RT-02 implementation level |
| Required | Code comment or schema annotation distinguishing the two AIR-N systems wherever both are used |
| Files | lib/runtime/constitutional-gate.js; lib/constitution/authority-resistance.js |

---

## RT-03 — KERNEL RUNTIME GAPS

### GAP-03-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-03-001 |
| Severity | CRITICAL |
| Complexity | M |
| Blocking Dependencies | GAP-07-001 (HistoricalStateQueryResult required) |
| Constitutional Requirement | A1-v1.2 §12.1 Step 3 Historical Contextualization: PETL must query RT-07 for HistoricalStateQueryResult at OPL Stage 2 |
| Current State | PETL has 7 preflight stages; no stage queries RT-07 for historical context |
| Required | Add PETL Stage 2.5 (Historical Contextualization): query RT-07, receive HistoricalStateQueryResult, attach to transaction context |
| Files | lib/runtime/execution-transaction.js |

### GAP-03-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-03-002 |
| Severity | CRITICAL |
| Complexity | L |
| Blocking Dependencies | GAP-05-001 (ChangeRecord/HistoricalAnchor required) |
| Constitutional Requirement | D4 §4.6 / A1-v1.2 §12.1 Step 11 / §8.1 VC-6: Gate 6 must use RT-05 ChangeRecord/HistoricalAnchor history |
| Current State | PETL Stage 7 is governance attestation; no Gate 6 check querying RT-05 ChangeRecord/HistoricalAnchor history |
| Required | PETL Gate 6 stage: query RT-05 for ChangeRecord and HistoricalAnchor, validate against D4 §4.6 requirements |
| Files | lib/runtime/execution-transaction.js; lib/reality/fabric.js |

### GAP-03-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-03-003 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-06-001 |
| Constitutional Requirement | A1-v1.2 Stage 10 Mandatory Propagation Window (MPW): RT-03 signals RT-06 to evaluate committed objects for GCR compliance after every Stage 10 commit |
| Current State | No Stage 10 MPW signal from PETL COMMITTED state to RT-06 |
| Required | Post-commit hook in PETL COMMITTED state that signals RT-06 coherence evaluation |
| Files | lib/runtime/execution-transaction.js; new: lib/coherence/stage10-signal.js |

### GAP-03-004
| Field | Value |
|-------|-------|
| Gap ID | GAP-03-004 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: KernelRecord — execution kernel record |
| Current State | No KernelRecord object; PETL produces transaction context but no formal KernelRecord |
| Required | KernelRecord type in execution-transaction.js or separate schema |
| Files | lib/runtime/execution-transaction.js |

---

## RT-04 — AUDIT RUNTIME GAPS

### GAP-04-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-04-001 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: AuditRecord — formal audit record type |
| Current State | decision_ledger.js uses receipt_id/integrity_hash but "AuditRecord" not used as type name |
| Required | Formalize AuditRecord type mapping to constitutional spec terminology |
| Files | lib/audit/decision_ledger.js |

### GAP-04-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-04-002 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-02-001 |
| Constitutional Requirement | AIR-5 (Audit Authority): RT-04 holds exclusive audit authority across all runtimes |
| Current State | Audit functions exist but AIR-5 is not explicitly enforced as an exclusive authority |
| Required | Authority type check: only RT-04 (holding AIR-5) may write to the audit ledger |
| Files | lib/audit/decision_ledger.js |

---

## RT-05 — REALITY FABRIC RUNTIME GAPS

### GAP-05-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-05-001 |
| Severity | CRITICAL |
| Complexity | M |
| Blocking Dependencies | GAP-03-002 (Gate 6 requires this) |
| Constitutional Requirement | ChangeRecord and HistoricalAnchor are RT-05 owned objects (D4 §4.6); required for Gate 6 |
| Current State | reality_claims table is the primary RT-05 store; ChangeRecord and HistoricalAnchor not identified as distinct object types within it |
| Required | ChangeRecord and HistoricalAnchor as distinct tracked entities queryable by RT-03 Gate 6; either as claim_type variants or separate table |
| Files | lib/reality/fabric.js; migrations/066_reality_fabric.sql |

### GAP-05-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-05-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-08-001 |
| Constitutional Requirement | D3 RF-A6: No external reality information enters the fabric except through a valid ObservationRecord (Projection Boundary) |
| Current State | Reality fabric accepts `claimReality()` calls from any source; no ObservationRecord gate at entry |
| Required | Observation Boundary gate at fabric entry: non-observation claims must pass through RT-08's ObservationRecord mechanism |
| Files | lib/reality/fabric.js; lib/reality/gates.js |

### GAP-05-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-05-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | RT-05 produces ChangeRecord on every state mutation; RT-06 reads these for coherence evaluation |
| Current State | claim_lifecycle_events captures stage transitions but ChangeRecord is not produced as a distinct object type |
| Required | ChangeRecord emission on every reality_claims mutation |
| Files | lib/reality/fabric.js; new table or object type |

---

## RT-06 — COHERENCE RUNTIME GAPS

### GAP-06-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-06-001 |
| Severity | HIGH |
| Complexity | L |
| Blocking Dependencies | GAP-03-003 (Stage 10 MPW signal) |
| Constitutional Requirement | A0 §3.7: RT-06 evaluates committed objects against GCR-1 through GCR-7 (seven coherence dimensions) |
| Current State | Coherence checks distributed across lib/constitution/ modules (contradiction-manager, deception-detector, confabulation-guard, etc.); GCR-1 through GCR-7 not named as distinct checks |
| Required | Formal GCR evaluation pipeline: 7 named coherence checks triggered by Stage 10 signal; produces CoherenceViolationRecord on failure |
| Files | New: lib/coherence/gcr-evaluator.js; new migration for coherence_violation_records table |

### GAP-06-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-06-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-06-001 |
| Constitutional Requirement | RS-07: CoherenceViolationRecord, CRE (Coherence Register Entry), CCR (Coherence Check Record) — all RT-06 owned objects |
| Current State | None found in codebase |
| Required | Three new object types with database backing |
| Files | New: lib/coherence/objects.js; new migration |

### GAP-06-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-06-003 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: DomainCoherenceStatus — RT-06 produces this for RT-15 instances |
| Current State | Not found |
| Required | DomainCoherenceStatus produced after GCR evaluation and delivered to each RT-15 instance |
| Files | New: lib/coherence/domain-status.js |

### GAP-06-004
| Field | Value |
|-------|-------|
| Gap ID | GAP-06-004 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | GAP-06-002 |
| Constitutional Requirement | RT-06 delivers CVR (CoherenceViolationRecord) to RT-04 (Audit) on coherence failure |
| Current State | No CVR delivery to audit ledger |
| Required | CoherenceViolationRecord → RT-04 audit ledger pipeline |
| Files | New: lib/coherence/gcr-evaluator.js → lib/audit/decision_ledger.js |

---

## RT-07 — MEMORY RUNTIME GAPS

### GAP-07-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-07-001 |
| Severity | CRITICAL |
| Complexity | M |
| Blocking Dependencies | GAP-03-001 depends on this |
| Constitutional Requirement | RS-07: HistoricalStateRecord (primary owned object) and HistoricalStateQueryResult (produced object) |
| Current State | 13-layer memory system exists; HistoricalStateRecord not named; HistoricalStateQueryResult not produced as distinct query response type |
| Required | Formal HistoricalStateRecord storage and HistoricalStateQueryResult query interface; queryable by RT-03 PETL Stage 2.5 |
| Files | lib/memory/gateway.js; lib/memory/episodic-memory-pg.js; new: lib/memory/historical-state.js |

### GAP-07-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-07-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | None |
| Constitutional Requirement | RT07-INV-1: Append-only memory — HistoricalStateRecords are never updated or deleted |
| Current State | Episodic memory uses Postgres; no database-level append-only constraint identified |
| Required | Append-only enforcement for HistoricalStateRecord table (no UPDATE/DELETE, Postgres policy or trigger) |
| Files | migrations/009_memory_architecture.sql; new migration |

### GAP-07-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-07-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | GAP-07-001 |
| Constitutional Requirement | PAIR 28 (A1-v1.2): RT-07 provides HistoricalStateQueryResult to RT-08 at OPL Stage 2 (Historical Contextualization) |
| Current State | No RT-07 → RT-08 channel implemented |
| Required | Historical contextualization integration point between RT-07 and RT-08 (or RT-07 and RT-03 PETL) |
| Files | lib/memory/gateway.js; lib/runtime/execution-transaction.js |

---

## RT-08 — OBSERVATION RUNTIME GAPS

### GAP-08-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-08-001 |
| Severity | HIGH |
| Complexity | L |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: ObservationRecord — primary owned object; carries all constitutionally required attributes |
| Current State | observer_registry table tracks sensors; no ObservationRecord as discrete formed object per observation |
| Required | ObservationRecord schema (entityId, domain, observedContent, sourceChannel, timestamp, confidenceScore, attributes); formation mechanism |
| Files | lib/observer-health/index.js; new: lib/observation/record.js; new migration |

### GAP-08-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-08-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-08-001 |
| Constitutional Requirement | D3 RF-A6 Observation Boundary: no external reality information enters the fabric except through a valid ObservationRecord |
| Current State | reality_claims API (POST /api/reality/claims) accepts any source without ObservationRecord gate |
| Required | Observation Boundary enforcement at fabric entry; external claims must carry valid ObservationRecord reference |
| Files | lib/reality/fabric.js; lib/observer-health/index.js |

### GAP-08-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-08-003 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-08-001 |
| Constitutional Requirement | RS-07: ObserverRegister, ObservationChannelRecord, ConsequenceObservationRecord, ObserverLimitationRecord |
| Current State | observer_registry ≈ ObserverRegister (conceptual match); other 3 objects absent |
| Required | ConsequenceObservationRecord (consequence observations distinct from external observations); ObservationChannelRecord; ObserverLimitationRecord |
| Files | lib/observer-health/index.js; new migration |

### GAP-08-004
| Field | Value |
|-------|-------|
| Gap ID | GAP-08-004 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-08-001, GAP-14-002 |
| Constitutional Requirement | A1-v1.2 §15.2: RT-08 is PRIMARY in Observation phase AND PRIMARY (in sequence with RT-14) in Observation of Consequence |
| Current State | No explicit loop phase participation modeled in codebase |
| Required | Constitutional Loop integration: RT-08 observation pipeline triggered by loop cycle; paired with RT-14 for Observation of Consequence phase |
| Files | New: lib/observation/loop-integration.js |

---

## RT-09 — KNOWLEDGE RUNTIME GAPS

### GAP-09-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-09-001 |
| Severity | HIGH |
| Complexity | L |
| Blocking Dependencies | GAP-08-001 |
| Constitutional Requirement | RS-07: KnowledgeRecord — primary owned object; formed from evidence processing |
| Current State | knowledge-graph.js (lib/memory/Layer 8) stores knowledge nodes; no KnowledgeRecord as constitutional object with evidence lineage |
| Required | KnowledgeRecord with evidence references; formation from ObservationRecord evidence; confidence scoring |
| Files | lib/memory/knowledge-graph.js; lib/intelligence/knowledge-validator.js; new: lib/knowledge/record.js |

### GAP-09-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-09-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-08-001, GAP-09-001 |
| Constitutional Requirement | Evidence processing pipeline: RT-09 receives ObservationRecords as evidence and synthesizes into KnowledgeRecords |
| Current State | No ObservationRecord → KnowledgeRecord pipeline |
| Required | Evidence ingestion: RT-08 delivers ObservationRecords to RT-09; RT-09 synthesizes into KnowledgeRecords; forwards to RT-10 |
| Files | New: lib/knowledge/evidence-pipeline.js |

### GAP-09-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-09-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: KnowledgeConflictRecord — records contradictions between knowledge items |
| Current State | contradiction-engine.js detects contradictions but no KnowledgeConflictRecord type |
| Required | KnowledgeConflictRecord type backed by database |
| Files | lib/intelligence/contradiction-engine.js; new migration |

---

## RT-10 — INTELLIGENCE RUNTIME GAPS

### GAP-10-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-10-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-09-001 |
| Constitutional Requirement | RS-07: CUM (Comprehensive Understanding Model) — primary object that RT-10 synthesizes and delivers to RT-11 |
| Current State | SIE synthesizes strategic guidance; no explicit CUM object with constitutional name and schema |
| Required | CUM as named object: versioned, timestamped, queryable, delivered to RT-11; invalidation mechanism (PAIR 32) |
| Files | lib/intelligence/sie.js; new: lib/intelligence/cum.js |

### GAP-10-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-10-002 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-10-001 |
| Constitutional Requirement | PAIR 32 (A1-v1.2): RT-10 must notify RT-11 when CUM is invalidated; RT-11's Deliberation phase requires valid CUM |
| Current State | No CUM invalidation notification pipeline |
| Required | CUM invalidation event: RT-10 notifies RT-11; RT-11 cannot proceed to Deliberation without valid CUM |
| Files | lib/intelligence/sie.js; civilisation/consensus.js |

---

## RT-11 — CIVILIZATION INTELLIGENCE RUNTIME GAPS

### GAP-11-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-11-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-10-001 |
| Constitutional Requirement | RS-07: CivilizationalDecisionProposal — primary owned object produced by RT-11 and delivered to RT-12 |
| Current State | Consensus protocol handles DOMAIN_OPERATION votes but no CivilizationalDecisionProposal object type |
| Required | CivilizationalDecisionProposal as named object with: deliberation inputs, rationale, proposed decision, constitutional grounding |
| Files | civilisation/consensus.js; new: lib/civilization/proposal.js |

### GAP-11-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-11-002 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-11-001 |
| Constitutional Requirement | Deliberation pipeline: RT-11 receives CUM from RT-10; deliberates; produces CivilizationalDecisionProposal; delivers to RT-12 |
| Current State | Consensus sessions exist but no explicit deliberation pipeline wiring RT-10 → RT-11 → RT-12 |
| Required | Formal deliberation pipeline with CUM input, deliberation process, proposal output, RT-12 delivery |
| Files | civilisation/consensus.js; lib/intelligence/sie.js; new: lib/civilization/deliberation.js |

---

## RT-12 — DECISION RUNTIME GAPS

### GAP-12-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-12-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-11-001 |
| Constitutional Requirement | RS-07: CivilizationalDecision — primary owned object; RT-12 forms this from validated CivilizationalDecisionProposal |
| Current State | Decision lattice produces outcomes; no formal CivilizationalDecision object type |
| Required | CivilizationalDecision as named object with: source proposal, authority validation record, authorized action parameters |
| Files | lib/runtime/decision-lattice.js; new: lib/decision/civilizational-decision.js |

### GAP-12-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-12-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-02-001 |
| Constitutional Requirement | RT-12 compliance gate: validates CivilizationalDecisionProposal against all authority constraints (AIR-2/Compliance); rejects on violation |
| Current State | Constitutional gate checks authority conceptually; no specific compliance gate for proposal validation |
| Required | Compliance gate that validates CivilizationalDecisionProposal against authority matrix before forming CivilizationalDecision |
| Files | lib/runtime/constitutional-gate.js; new: lib/decision/compliance-gate.js |

### GAP-12-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-12-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | GAP-12-001 |
| Constitutional Requirement | RS-07: OpenActionRegisterEntry, DecisionArchiveRecord, CivilizationalDecisionChainRecord |
| Current State | None found |
| Required | Three additional owned object types with database backing |
| Files | New: lib/decision/objects.js; new migration |

---

## RT-13 — ACTION RUNTIME GAPS

### GAP-13-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-13-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-12-001 |
| Constitutional Requirement | RS-07: EffectExpectationRecord — RT-13 produces this to inform RT-14 of expected consequences |
| Current State | PETL executes actions; no EffectExpectationRecord produced or delivered to RT-14 |
| Required | EffectExpectationRecord production on every action execution; delivery to RT-14 |
| Files | lib/runtime/execution-transaction.js; new: lib/action/effect-expectation.js |

### GAP-13-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-13-002 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-08-001 |
| Constitutional Requirement | A0 §3.14 Responsibility 9: RT-13 always notifies RT-08 after Projection Boundary crossing to enable RT-14 consequence observation |
| Current State | Action execution via PETL; no RT-08 notification after execution |
| Required | Post-execution RT-08 notification with execution metadata |
| Files | lib/runtime/execution-transaction.js; lib/observer-health/index.js |

### GAP-13-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-13-003 |
| Severity | MEDIUM |
| Complexity | S |
| Blocking Dependencies | None |
| Constitutional Requirement | RS-07: ProjectionRecord — records what was projected into external reality |
| Current State | lib/reality/projections/ modules exist; no formal ProjectionRecord type |
| Required | ProjectionRecord type tracking projection metadata |
| Files | lib/reality/projections/; new: lib/action/projection-record.js |

---

## RT-14 — REFLECTION RUNTIME GAPS

### GAP-14-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-14-001 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-08-003, GAP-13-001 |
| Constitutional Requirement | RS-07: ConsequenceObservationRecord — primary owned object; formed from RT-08 ConsequenceObservationRecord input |
| Current State | outcome-registry.js tracks outcomes but not named ConsequenceObservationRecord |
| Required | ConsequenceObservationRecord as formal type with: action reference, expected effects, observed effects, deviation metrics |
| Files | lib/runtime/outcome-registry.js; new: lib/reflection/consequence-record.js |

### GAP-14-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-14-002 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-14-001 |
| Constitutional Requirement | RS-07: DomainUpdateTrigger — RT-14 produces this and delivers to affected RT-15 instances |
| Current State | No DomainUpdateTrigger object or delivery mechanism |
| Required | DomainUpdateTrigger production after consequence observation; delivery to affected domain instances |
| Files | lib/runtime/outcome-registry.js; civilisation/domain-loader.js |

---

## RT-15 — DOMAIN RUNTIME GAPS

### GAP-15-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-15-001 |
| Severity | CRITICAL |
| Complexity | L |
| Blocking Dependencies | None |
| Constitutional Requirement | A0 §3.16: 12 domain instances (DOM-000001 through DOM-000012) |
| Current State | 10 domains implemented (DOM-000001 through DOM-000010); DOM-000011 and DOM-000012 absent |
| Required | Two additional domain instances with full structure: index.js, genome.yaml, src/runtime/index.js, registry/ directory, contracts/ directory |
| Files | New: domains/{domain11}/, domains/{domain12}/; civilisation/domain-loader.js update |

### GAP-15-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-15-002 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-06-003 |
| Constitutional Requirement | DomainCoherenceStatus received from RT-06; domains must process and respond to coherence status |
| Current State | No DomainCoherenceStatus received by domain instances |
| Required | DomainCoherenceStatus receiver in each domain instance; response mechanism on coherence violation |
| Files | domains/*/src/runtime/index.js; new: lib/coherence/domain-status.js |

### GAP-15-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-15-003 |
| Severity | MEDIUM |
| Complexity | M |
| Blocking Dependencies | GAP-14-002 |
| Constitutional Requirement | DomainUpdateTrigger received from RT-14; domains update Understanding Model on trigger |
| Current State | No DomainUpdateTrigger delivery to domain instances |
| Required | DomainUpdateTrigger receiver in each domain instance |
| Files | domains/*/src/runtime/index.js; civilisation/domain-loader.js |

### GAP-15-004
| Field | Value |
|-------|-------|
| Gap ID | GAP-15-004 |
| Severity | LOW |
| Complexity | M |
| Blocking Dependencies | None |
| Constitutional Requirement | D6 Part 10: 8 Domain Failure Modes (DF-1 through DF-8); each domain must detect and report failures |
| Current State | genome-validator.js validates invariants in advisory mode; no formal DF-1 through DF-8 failure detection |
| Required | Formal failure mode detection pipeline for DF-1 through DF-8 in each domain |
| Files | civilisation/genome-validator.js; domains/*/src/runtime/index.js |

---

## RT-16 — AMENDMENT RUNTIME GAPS

### GAP-16-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-16-001 |
| Severity | CRITICAL |
| Complexity | XL |
| Blocking Dependencies | GAP-11-001 (RT-11 initiates amendment) |
| Constitutional Requirement | D7 Part 12: Complete 15-step amendment execution order (A1-v1.2 §12.8) |
| Current State | lib/constitution/amendments.json = `{amendments:[], latest_amendment_id:null}`; consensus.js has SESSION_TYPES.CONSTITUTIONAL_AMENDMENT but no pipeline |
| Required | Full 15-step amendment execution pipeline: proposal receipt → Class classification → Class IV immediate rejection → deliberation → Preservation Audit (Class I) → ratification/rejection → record creation |
| Files | New: lib/amendment/pipeline.js; new: lib/amendment/classifier.js; new: lib/amendment/preservation-audit.js |

### GAP-16-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-16-002 |
| Severity | CRITICAL |
| Complexity | L |
| Blocking Dependencies | GAP-16-001 |
| Constitutional Requirement | RS-07: AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord, AmendmentRejectionRecord — all 4 owned objects |
| Current State | None found; amendments.json is empty |
| Required | All 4 object types with database backing and management API |
| Files | New: lib/amendment/objects.js; new migration; new routes/amendment.js |

### GAP-16-003
| Field | Value |
|-------|-------|
| Gap ID | GAP-16-003 |
| Severity | HIGH |
| Complexity | M |
| Blocking Dependencies | GAP-16-002 |
| Constitutional Requirement | Class I/II/III/IV amendment classification per D7 §12.1 |
| Current State | No classification logic |
| Required | Amendment class classifier: Class I (founding-level), II (constitutional), III (operational), IV (inadmissible — immediate rejection) |
| Files | New: lib/amendment/classifier.js |

### GAP-16-004
| Field | Value |
|-------|-------|
| Gap ID | GAP-16-004 |
| Severity | HIGH |
| Complexity | L |
| Blocking Dependencies | GAP-16-003 |
| Constitutional Requirement | RT-16 Class IV immediate rejection: no deliberation, immediate RejectionRecord per D7 §12.1 |
| Current State | No immediate rejection path |
| Required | Class IV detection on proposal receipt → immediate RejectionRecord → no deliberation pipeline entered |
| Files | New: lib/amendment/pipeline.js |

### GAP-16-005
| Field | Value |
|-------|-------|
| Gap ID | GAP-16-005 |
| Severity | HIGH |
| Complexity | L |
| Blocking Dependencies | GAP-16-001 |
| Constitutional Requirement | Preservation Audit gate for Class I amendments (PAIR 60 special gate authority per FAA-16-002 constitutional substance) |
| Current State | Not implemented |
| Required | Preservation Audit step in Class I amendment pipeline; special gate authority check |
| Files | New: lib/amendment/preservation-audit.js |

---

## CROSS-RUNTIME PIPELINE GAPS

### GAP-PIPE-001
| Field | Value |
|-------|-------|
| Gap ID | GAP-PIPE-001 |
| Severity | CRITICAL |
| Complexity | XL |
| Description | The full Constitutional Loop (Observation → Knowledge → Understanding → Deliberation → Decision → Action → Observation of Consequence → Updated Understanding → Reflection) is not implemented as an end-to-end wired pipeline. Individual runtimes have partial implementations but they do not exchange the constitutional objects (ObservationRecord → KnowledgeRecord → CUM → CivilizationalDecisionProposal → CivilizationalDecision → EffectExpectationRecord → ConsequenceObservationRecord → DomainUpdateTrigger) in sequence. |
| Required | Constitutional Loop orchestrator wiring all 16 runtimes with their constitutional objects in the correct sequence |
| Blocking Dependencies | GAP-08-001, GAP-09-001, GAP-10-001, GAP-11-001, GAP-12-001, GAP-13-001, GAP-14-001, GAP-15-003 |

### GAP-PIPE-002
| Field | Value |
|-------|-------|
| Gap ID | GAP-PIPE-002 |
| Severity | HIGH |
| Complexity | L |
| Description | PETL Gate 6 integration with RT-05 ChangeRecord/HistoricalAnchor and RT-07 HistoricalStateQueryResult |
| Required | PETL preflight must query RT-07 (Step 3) and RT-05 (Gate 6 / Step 11) before committing execution |
| Blocking Dependencies | GAP-05-001, GAP-07-001 |

---

## GAP COUNT SUMMARY

| Runtime | CRITICAL | HIGH | MEDIUM | LOW | Total |
|---------|----------|------|--------|-----|-------|
| RT-01 | 0 | 1 | 2 | 0 | 3 |
| RT-02 | 0 | 1 | 2 | 0 | 3 |
| RT-03 | 2 | 1 | 1 | 0 | 4 |
| RT-04 | 0 | 0 | 2 | 0 | 2 |
| RT-05 | 1 | 1 | 1 | 0 | 3 |
| RT-06 | 0 | 2 | 2 | 0 | 4 |
| RT-07 | 1 | 1 | 1 | 0 | 3 |
| RT-08 | 0 | 2 | 2 | 0 | 4 |
| RT-09 | 0 | 2 | 1 | 0 | 3 |
| RT-10 | 0 | 1 | 1 | 0 | 2 |
| RT-11 | 0 | 1 | 1 | 0 | 2 |
| RT-12 | 0 | 2 | 1 | 0 | 3 |
| RT-13 | 0 | 2 | 1 | 0 | 3 |
| RT-14 | 0 | 1 | 1 | 0 | 2 |
| RT-15 | 1 | 0 | 2 | 1 | 4 |
| RT-16 | 2 | 3 | 0 | 0 | 5 |
| Cross-RT | 1 | 1 | 0 | 0 | 2 |
| **TOTAL** | **8** | **22** | **21** | **1** | **52** |

---

*End of I0-IMPLEMENTATION-GAP-REGISTER.md*
*Register ID: I0-GAPS | Date: 2026-07-25*
