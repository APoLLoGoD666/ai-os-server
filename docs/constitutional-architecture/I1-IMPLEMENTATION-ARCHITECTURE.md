# I1 — IMPLEMENTATION ARCHITECTURE
## APEX Constitutional Architecture — Engineering Blueprint

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I1-ARCHITECTURE |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | C0-CONSTITUTIONAL-FREEZE-DECLARATION.md; A0-v1.1.1; A1-v1.2; R0-v1.0; D8-v1.0 |
| I0 Basis | I0-IMPLEMENTATION-BASELINE-AUDIT.md; I0-RUNTIME-IMPLEMENTATION-MATRIX.md; I0-IMPLEMENTATION-GAP-REGISTER.md; I0-LEGACY-AND-OVERLAP-REGISTER.md |

**Purpose:** This document is the single engineering blueprint for evolving the current APEX repository into the constitutionally specified APEX-CONSTITUTION-v1.0 architecture. Every architectural decision herein derives from constitutional authority. Implementers must not substitute judgment for these decisions; they must follow them or amend the constitution through RT-16.

---

## PART 1 — IMPLEMENTATION PHILOSOPHY

### 1.1 The Fundamental Principle: Adaptation Over Replacement

The APEX repository contains substantial, production-running implementations that approximate the constitutional architecture. The constitutional specifications describe WHAT the system must do, not HOW it must be implemented. Implementation must preserve existing working code wherever constitutionally viable.

**Constitutional basis:** D8 §1.2 (Implementation Subordination Principle) — implementations must realize constitutional requirements; they have discretion over mechanism. D8 §4.1 — constitutional objects are logical entities; their physical realization is an implementation choice.

**Practical application:** The existing PETL state machine, reality fabric, 13-layer memory gateway, SIE, consensus protocol, and decision lattice are constitutionally viable implementations of RT-03/RT-13, RT-05, RT-07, RT-10, RT-11, and RT-12 respectively. They will be adapted, not replaced.

### 1.2 Constitutional Object Types as the Integration Mechanism

The primary mechanism for bringing the repository into constitutional compliance is the introduction of constitutional object types. Most existing implementations produce correct behavior but under pre-constitutional names with pre-constitutional schemas. Introducing constitutional object types as named wrappers or schemas — without rewriting the underlying logic — achieves constitutional compliance while minimizing disruption.

**Constitutional basis:** D8 §4.2 (Canonical Constitutional Object Types) — the implementation must support exactly these types. D8 §4.3 (Implementation Object Requirements) — implementation objects must be recognizable realizations of constitutional categories.

### 1.3 The Constitutional Loop as the Central Organizing Principle

All architectural decisions derive from a single requirement: the Constitutional Loop (D8 CLI-1 through CLI-4) must be fully implemented. Every phase of the loop must execute in sequence, produce constitutional objects, and deliver them to the next phase. The existing `middleware/civilization-kernel.js` is the implementation host of this loop; it must be extended, not replaced.

**Constitutional basis:** D8 §6.2 (Constitutional Loop Implementation Requirements) — all nine loop stages must be executable. CLI-1 — no stage may be omitted.

### 1.4 Minimum Disruption to Production Systems

Implementation waves must not break production functionality. The existing system runs in production on Render with a live user. Each wave must:
1. Be independently deployable
2. Not break existing routes or APIs
3. Add constitutional behavior on top of existing behavior
4. Fail-closed only for new constitutional gates; existing behavior is preserved as legacy paths during the transition

### 1.5 The Agent-System / Lib Boundary

`agent-system/` is the pre-constitutional execution environment. `lib/` is the constitutional implementation layer. During the transition period, both may run simultaneously. The constitutional layer takes precedence for all Class A operations (per D-4 §2.1 KMP). The boundary declaration (I0-LEGACY-AND-OVERLAP-REGISTER.md PWA-01) must be produced before any Wave 1 implementation begins.

---

## PART 2 — ARCHITECTURAL LAYERING

### 2.1 Target Architectural Model

The target architecture has seven layers, derived from A0-v1.1.1 §2 and D8 §9 (MVCS):

```
┌─────────────────────────────────────────────────────────┐
│  Layer 7 — Constitutional Maintenance Layer              │
│  RT-16 (Amendment Runtime)                               │
│  lib/amendment/ | routes/amendments.js                   │
├─────────────────────────────────────────────────────────┤
│  Layer 6 — Domain Layer                                  │
│  RT-15 (Domain Runtime ×12)                              │
│  domains/[01-12]/ | civilisation/domain-loader.js        │
├─────────────────────────────────────────────────────────┤
│  Layer 5 — Action/Reflection Layer                       │
│  RT-13 (Action) | RT-14 (Reflection)                     │
│  lib/runtime/execution-transaction.js (EXECUTING)        │
│  lib/runtime/outcome-registry.js | lib/action/           │
│  lib/reflection/                                         │
├─────────────────────────────────────────────────────────┤
│  Layer 4 — Decision/Compliance Layer                     │
│  RT-12 (Constitutional Compliance Runtime)               │
│  lib/runtime/decision-lattice.js | lib/decision/         │
├─────────────────────────────────────────────────────────┤
│  Layer 3 — Epistemic Chain                               │
│  RT-08 (Observation) | RT-09 (Knowledge) |               ��
│  RT-10 (Understanding) | RT-11 (Deliberation/Decision)   │
│  lib/observer-health/ | lib/observation/                 │
│  lib/knowledge/ | lib/intelligence/sie.js                │
│  civilisation/consensus.js | lib/civilization/           │
├─────────────────────────────────────────────────────────┤
│  Layer 2 — Coherence/Memory/Reality Layer                │
│  RT-05 (Reality Fabric) | RT-06 (Coherence)              │
│  RT-07 (Memory)                                          │
│  lib/reality/ | lib/coherence/                           │
│  lib/memory/ | lib/constitution/                         │
├─────────────────────────────────────────────────────────┤
│  Layer 1 — Foundational Layer                            │
│  RT-01 (Identity) | RT-02 (Authority)                    │
│  RT-03 (Kernel) | RT-04 (Audit)                          │
│  lib/identity/ | lib/constitution/authority-resistance.js│
│  middleware/civilization-kernel.js                       │
│  lib/runtime/execution-transaction.js                    │
│  lib/audit/decision_ledger.js                            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Cross-Cutting Concerns (Present at All Layers)

The following are present at every layer, per A1-v1.2 §15.2 (Constitutional Foundation Layer):

| Concern | Implementation | Constitutional Basis |
|---------|---------------|---------------------|
| Identity validation | lib/memory/access-controller.js | RT-01; every Class A operation |
| Authority validation | lib/runtime/constitutional-gate.js Gate 3 | RT-02; D-4 §3.3 |
| Kernel mediation | middleware/civilization-kernel.js + PETL | RT-03; D-4 §2.1 KMP |
| Audit observation | lib/audit/decision_ledger.js | RT-04; D-6 §3.4 AIR-5 |
| Reality persistence | lib/reality/fabric.js | RT-05; D-4 §4.1 |
| Coherence evaluation | lib/coherence/gcr-evaluator.js (new) | RT-06; Stage 10 MPW |
| Historical state | lib/memory/gateway.js | RT-07; every phase |
| Constitutional object types | lib/constitutional-types/ (new) | D8 §4.2 |

### 2.3 The Two Execution Environments

The repository currently operates two execution environments. These must be explicitly maintained and bounded:

**Environment A — Constitutional Loop (Target):**
- Entry point: HTTP request → `server.js` → `middleware/civilization-kernel.js`
- Mediation: `lib/runtime/execution-transaction.js` (PETL, Class A operations)
- Exit: HTTP response + episodic memory write + audit record
- Constitutional status: Authoritative; implements the loop in the request-response cycle

**Environment B — Agent System (Pre-Constitutional):**
- Entry point: `agent-system/orchestrator.js` / `agent-system/master-orchestrator.js`
- Mediation: Pre-constitutional; no PETL for all operations
- Constitutional status: Legacy; being phased out or subordinated
- Interim: Agent operations must pass through Environment A for Class A operations

**Boundary rule:** Any operation in Environment B that produces or consumes a Constitutional Object MUST route through Environment A (the Constitutional Loop) for that operation. This is the Kernel Mediation Principle (D-4 §2.1 KMP) applied to the agent system transition.

---

## PART 3 — RUNTIME INTERACTION ARCHITECTURE

### 3.1 The Kernel Mediation Principle in Repository Terms

**All Class A operations pass through `middleware/civilization-kernel.js` → `lib/runtime/execution-transaction.js`.**

This is the repository expression of D-4 §2.1: "All Class A operations from any actor-runtime pass through RT-03 before admission to the Reality Fabric."

No implementation decision may create a pathway that bypasses this chain for Class A operations. This prohibition corresponds to D8 PROH-3 (No Authority Bypass) and A1 §14.3 (Forbidden Interactions: RT-[N] → RT-03 bypass).

### 3.2 The Six Gates (VC-1 through VC-6) in Repository Terms

The six RT-03 gates (A1-v1.2 §8.1) map to the following implementation locations:

| Gate | Validation Checkpoint | Current Location | Status |
|------|----------------------|------------------|--------|
| Gate 1 (VC-1) | Identity Validation | `lib/runtime/constitutional-gate.js` authority stage | PARTIAL — identity present, IdentityRecord not formal |
| Gate 2 (VC-2) | Object State Validation | `lib/reality/fabric.js` state check | PARTIAL — state check exists, not Gate-labeled |
| Gate 3 (VC-3) | Authority Validation | `lib/runtime/constitutional-gate.js` authority type check | PARTIAL — conceptual, not AIR-1–5 typed |
| Gate 4 (VC-4) | Epistemic Validation | `lib/runtime/constitutional-gate.js` deception/confabulation | PARTIAL — confabulation/deception checked; not formal epistemic chain check |
| Gate 5 (VC-5) | Constitutive Coherence | `lib/runtime/constitutional-gate.js` constitution stage | PARTIAL �� constitutional principles checked |
| Gate 6 (VC-6) | Temporal Integrity | MISSING | GAP-03-002 |

All gates are implemented within `lib/runtime/constitutional-gate.js` (called from `civilization-kernel.js`). Gate 6 must be added as a new check that queries `lib/reality/fabric.js` for ChangeRecord/HistoricalAnchor history.

### 3.3 The PETL State Machine as the Constitutional Operation Lifecycle

The PETL state machine (`lib/runtime/execution-transaction.js`) implements the D-4 §3.3 ten-stage operation lifecycle:

| Constitutional Stage | PETL State | Gap |
|---------------------|------------|-----|
| Stage 1 — Projection Boundary Receipt | PENDING | None |
| Stage 2 — Historical Contextualization | PENDING→PREFLIGHT | GAP-03-001 (no RT-07 query) |
| Stage 3 — Gate 1: Identity | PREFLIGHT Stage 1 (AUTH) | Partial |
| Stage 4 — Gate 2: Object State | PREFLIGHT Stage 2 | Partial |
| Stage 5 — Gate 3: Authority | PREFLIGHT Stage 3-5 | Partial |
| Stage 6 — Gate 4: Epistemic | PREFLIGHT Stage 5 (constitution) | Partial |
| Stage 7 — Gate 5: Compliance | PREFLIGHT Stage 6 (lattice) | Partial |
| Stage 8 — Gate 6: Temporal Integrity | PREFLIGHT Stage 7 (attestation) | GAP-03-002 (wrong check) |
| Stage 9 — Commit Preparation | COMMITTED | Complete |
| Stage 10 — Atomic Commit | EXECUTING | Complete |
| Stage 11 — Post-Commit MPW | FINALIZED | GAP-03-003 (no RT-06 signal) |

### 3.4 Runtime Communication Mechanisms

The A1-v1.2 §13.2 16×16 Permission Matrix defines how runtimes interact. In repository terms:

| Mechanism | A1 Matrix Code | Repository Implementation |
|-----------|---------------|--------------------------|
| KRNL (Kernel-mediated) | Class A via RT-03 | HTTP → civilization-kernel → PETL |
| DLVR (Object delivery) | Direct within same process | Function call between lib/ modules |
| QURY (Read query) | Direct read-only | Function call, no mutation |
| ADIT (Audit observation) | Class B, AIR-5 | decision_ledger.js append-only write |
| TMPL (Historical state) | RT-07 read | lib/memory/gateway.js getContext() |
| PRVD (RT-05 state) | RT-05 read | lib/reality/fabric.js claimReality() |
| NTFY (Class B notification) | Async event | event-bus.js OR post-commit hook |
| PEER (RT-15 inter-domain) | Kernel-mediated for mutation | civilisation/consensus.js |

### 3.5 The Constitutional Loop Implementation Map

The D8 Constitutional Loop phases (A1-v1.2 §15.2) map to the following implementation chain:

```
Phase 1 (Observation):
  Entry: POST /api/reality/claims | any external input
  RT-08: lib/observer-health/index.js → ObservationRecord [NEW type]
  RT-07: lib/memory/gateway.js → HistoricalStateQueryResult [NEW type]
  → PETL begin() → Gates 1-6

Phase 2 (Evidence):
  RT-09: lib/intelligence/knowledge-validator.js → EvidenceRecord
  → Class A submission through PETL

Phase 3 (Knowledge):
  RT-09 (advanced): lib/memory/knowledge-graph.js (Layer 8) → KnowledgeRecord [NEW type]
  RT-15 support: domains/*/src/runtime/index.js domain context queries

Phase 4 (Understanding):
  RT-10: lib/intelligence/sie.js → CUM [NEW type wrapping SIE output]
  RT-15: domains/*/src/runtime/index.js → DUM contributions

Phase 5 (Deliberation):
  RT-11: civilisation/consensus.js → CivilizationalDecisionProposal [NEW type]
  RT-10 support: CUM delivered to deliberation context

Phase 6 (Decision):
  RT-11: civilisation/consensus.js (APPROVED session) → CivilizationalDecision [NEW type]
  RT-12: lib/runtime/decision-lattice.js → Compliance Verification Record

Phase 7 (Action):
  RT-13: lib/runtime/execution-transaction.js (EXECUTING state)
  → EffectExpectationRecord [NEW type] produced at COMMITTED
  → External action execution
  → ProjectionRecord [NEW type]

Phase 8 (Consequence — External Reality):
  External systems produce consequences

Phase 9 (Observation of Consequence):
  RT-14: lib/runtime/outcome-registry.js → ConsequenceObservationRecord [NEW type]
  RT-08: lib/observer-health/index.js (consequence re-entry)

Phase 10 (Updated Understanding):
  RT-09→RT-10→RT-11: understanding update cycle
  RT-14: DomainUpdateTrigger [NEW type] delivered to RT-15 instances

Constitutional Foundation (every phase):
  RT-01: lib/memory/access-controller.js
  RT-02: lib/constitution/authority-resistance.js
  RT-03: middleware/civilization-kernel.js + lib/runtime/execution-transaction.js
  RT-04: lib/audit/decision_ledger.js (async, post-commit)
  RT-05: lib/reality/fabric.js (commit target)
  RT-06: lib/coherence/gcr-evaluator.js [NEW] (Stage 10 MPW)
  RT-07: lib/memory/gateway.js
```

---

## PART 4 — CONSTITUTIONAL OBJECT FLOW

### 4.1 The Canonical Provenance Chain

Every constitutional operation produces a chain of objects whose provenance must be unbroken (A1-v1.2 §9.2, D8 INV-2):

```
External Event
  → ObservationRecord (RT-08, owned: RT-08)
      → EvidenceRecord (RT-09, owned: RT-09)
          → KnowledgeRecord (RT-09, owned: RT-09)
              → DomainUnderstandingModel × 12 (RT-10 per domain, owned: RT-10)
                  → CUM (RT-10 synthesis, owned: RT-10)
                      → CivilizationalDecisionProposal (RT-11, owned: RT-11)
                          → ComplianceVerificationRecord (RT-12, owned: RT-12)
                              → GateResult × 6 (RT-03, owned: RT-03)
                                  → CivilizationalDecision (RT-11, owned: RT-11)
                                      → KernelRecord (RT-03, owned: RT-03)
                                          → EffectExpectationRecord (RT-13, owned: RT-13)
                                              → ProjectionRecord (RT-13, owned: RT-13)
                                                  → ConsequenceObservationRecord (RT-14, owned: RT-14)
                                                      → AuditRecord (RT-04, owned: RT-04)
                                                      → DomainUpdateTrigger (RT-14, owned: RT-14)
                                                          → [loops back to ObservationRecord]
```

**Provenance rule (PA-5):** Each object in this chain must reference its predecessor's ID in its provenance anchor. This chain is permanent and append-only (D8 PROH-4, PROH-5).

### 4.2 Constitutional Object Type Registry

All constitutional object types must be defined in `lib/constitutional-types/` (new directory):

| Type | Owner | Basis | New/Existing |
|------|-------|-------|-------------|
| IdentityRecord | RT-01 | R1-v1.1 RS-07 | New |
| IdentityManifest | RT-01 | R1-v1.1 RS-07 | New |
| AuthorityValidationRecord | RT-02 | R2-v1.0 RS-07 | New |
| AuthorityCertificate | RT-02 | R2-v1.0 RS-07 | New |
| KernelRecord | RT-03 | R3-v1.0 RS-07 | New |
| GateResult | RT-03 | R3-v1.0 RS-07 | New |
| AuditRecord | RT-04 | R4-v1.0 RS-07 | New (wraps decision_ledger receipt) |
| ChangeRecord | RT-05 | R5-v1.0 RS-07; D4 §4.6 | New |
| HistoricalAnchor | RT-05 | R5-v1.0 RS-07; D4 §4.6 | New |
| CoherenceViolationRecord | RT-06 | R6-v1.1.1 RS-07 | New |
| CoherenceRegisterEntry | RT-06 | R6-v1.1.1 RS-07 | New |
| DomainCoherenceStatus | RT-06 | R6-v1.1.1 RS-07 | New |
| HistoricalStateRecord | RT-07 | R7-v1.1 RS-07 | New |
| HistoricalStateQueryResult | RT-07 | R7-v1.1 RS-07 | New |
| ObservationRecord | RT-08 | R8-v1.1 RS-07 | New |
| ObservationChannelRecord | RT-08 | R8-v1.1 RS-07 | New |
| ObserverLimitationRecord | RT-08 | R8-v1.1 RS-07 | New |
| KnowledgeRecord | RT-09 | R9-v1.0 RS-07 | New |
| EvidenceRecord | RT-09 | R9-v1.0 RS-07 | New |
| KnowledgeConflictRecord | RT-09 | R9-v1.0 RS-07 | New |
| CUM (Comprehensive Understanding Model) | RT-10 | R10-v1.1 RS-07 | New (wraps SIE output) |
| DomainUnderstandingModel | RT-10 | R10-v1.1 RS-07 | New |
| CivilizationalDecisionProposal | RT-11 | R11-v1.3 RS-07 | New |
| ComplianceVerificationRecord | RT-12 | RT12-v1.0 RS-07 | New |
| CivilizationalDecision | RT-11 | RT12-v1.0 RS-07; C0-MANIFEST §5.2 item 4 | New |
| OpenActionRegisterEntry | RT-12 | RT12-v1.0 RS-07 | New |
| EffectExpectationRecord | RT-13 | R13-v1.0 RS-07 | New |
| ProjectionRecord | RT-13 | R13-v1.0 RS-07 | New |
| ConsequenceObservationRecord | RT-14 | R14-v1.0 RS-07 | New |
| DomainUpdateTrigger | RT-14 | R14-v1.0 RS-07 | New |
| DomainCoherenceStatus | RT-15 | R15-v1.0 RS-07 | New (receiver) |
| AmendmentProposal | RT-16 | R16-v1.0 RS-07 | New |
| AmendmentRegistry | RT-16 | R16-v1.0 RS-07 | New |
| RatifiedAmendmentRecord | RT-16 | R16-v1.0 RS-07 | New |
| AmendmentRejectionRecord | RT-16 | R16-v1.0 RS-07 | New |

**Constitutional note on CivilizationalDecision ownership:** RT-11 owns the `CivilizationalDecisionProposal` and the final `CivilizationalDecision` (C0-MANIFEST §5.2 item 4). RT-12 owns the `ComplianceVerificationRecord` that gates decision formation. RT-12 is NOT the "Decision Runtime" in the sense of owning the decision — it is the compliance layer. The decision-lattice.js in `lib/runtime/` is RT-12 infrastructure, not RT-11 infrastructure.

---

## PART 5 — OWNERSHIP BOUNDARIES

### 5.1 Constitutional Module Ownership

Each constitutional runtime has a primary implementation directory. No file outside its assigned directory may create, modify, or delete its owned constitutional objects without passing through RT-03 mediation.

| Runtime | Primary Directory | Secondary Directories | Can Write To |
|---------|------------------|-----------------------|-------------|
| RT-01 | lib/identity/ (new) | lib/memory/access-controller.js | IdentityRecord, IdentityManifest |
| RT-02 | lib/constitution/authority-resistance.js | lib/runtime/constitutional-gate.js (Gate 3) | AuthorityValidationRecord, AuthorityCertificate |
| RT-03 | middleware/civilization-kernel.js, lib/runtime/execution-transaction.js | lib/runtime/constitutional-gate.js | KernelRecord, GateResult |
| RT-04 | lib/audit/decision_ledger.js | None (observer only) | AuditRecord (append-only; cannot modify other RT objects) |
| RT-05 | lib/reality/fabric.js, lib/reality/gates.js | lib/reality/reality_loop.js | ChangeRecord, HistoricalAnchor |
| RT-06 | lib/coherence/ (new) | lib/constitution/ (existing checks) | CoherenceViolationRecord, DomainCoherenceStatus |
| RT-07 | lib/memory/ (entire directory) | None | HistoricalStateRecord, HistoricalStateQueryResult |
| RT-08 | lib/observation/ (new), lib/observer-health/ | None | ObservationRecord, ObservationChannelRecord |
| RT-09 | lib/knowledge/ (new) | lib/intelligence/knowledge-validator.js, lib/memory/knowledge-graph.js | KnowledgeRecord, EvidenceRecord |
| RT-10 | lib/intelligence/sie.js, lib/intelligence/ | lib/understanding/ | CUM, DomainUnderstandingModel |
| RT-11 | civilisation/consensus.js, lib/civilization/deliberation.js (new) | lib/intelligence/strategy-engine.js | CivilizationalDecisionProposal, CivilizationalDecision |
| RT-12 | lib/runtime/decision-lattice.js, lib/decision/ (new) | lib/runtime/governance-contract.js | ComplianceVerificationRecord, OpenActionRegisterEntry |
| RT-13 | lib/runtime/execution-transaction.js (EXECUTING), lib/action/ (new) | lib/reality/projections/ | EffectExpectationRecord, ProjectionRecord |
| RT-14 | lib/runtime/outcome-registry.js, lib/reflection/ (new) | lib/runtime/outcome-lineage.js | ConsequenceObservationRecord, DomainUpdateTrigger |
| RT-15 | domains/ (12 instances), civilisation/domain-loader.js | civilisation/shadow-registry.js | DomainUnderstandingModel contributions |
| RT-16 | lib/amendment/ (new), routes/amendments.js | lib/constitution/amendments.json | AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord, AmendmentRejectionRecord |

### 5.2 The Cross-Runtime Mutation Prohibition in Repository Terms

From A1-v1.2 §7.2: "No runtime may mutate objects owned by another runtime."

In repository terms: No `lib/intelligence/` file may write to `lib/memory/` tables. No `lib/runtime/decision-lattice.js` may write to `lib/reality/fabric.js` directly. All cross-module object mutations must route through `lib/runtime/execution-transaction.js` (PETL = RT-03).

**Exceptions (A1-v1.2 §7.2):**
1. RT-03 commits to RT-05 — `lib/runtime/execution-transaction.js` EXECUTING state calls `lib/reality/fabric.js`
2. RT-04 appends audit annotations — `lib/audit/decision_ledger.js` may append to any object's audit trail

### 5.3 RT-04 Audit Independence

RT-04 (`lib/audit/decision_ledger.js`) observes all operations through AIR-5 authority. It is never gated by RT-03. In repository terms:
- `decision_ledger.js` must never be wrapped in PETL
- `decision_ledger.js` calls are always fire-and-forget from the caller's perspective (NON-BLOCK per A1 §8.1 VC-8)
- `decision_ledger.js` records are append-only (D8 PROH-5); no UPDATE or DELETE queries ever

### 5.4 RT-16 Exclusion from Standard Loop

RT-16 (Amendment Runtime) is constitutionally absent from all 10 phases of the standard Constitutional Loop (C0-MANIFEST §5.2 item 5). It operates exclusively through the 15-step Amendment Execution Order (A1-v1.2 §12.8). Implementation must not add RT-16 to any loop phase handler or PETL stage.

---

## PART 6 — IMPLEMENTATION DEPENDENCY GRAPH

### 6.1 Hard Dependencies (Blocking)

These dependencies must be resolved in strict order. No implementation wave may begin before its prerequisites are complete.

```
RT-01 (IdentityRecord) 
  → RT-02 (AuthorityCertificate requires IdentityRecord)
  → RT-03 (KernelRecord requires AuthorityCertificate for Gate 3)

RT-05 (ChangeRecord, HistoricalAnchor)
  → RT-03 (Gate 6 requires ChangeRecord/HistoricalAnchor)

RT-07 (HistoricalStateQueryResult)
  → RT-03 (PETL Step 2 requires HistoricalStateQueryResult)

RT-08 (ObservationRecord)
  → RT-05 (Observation Boundary gate on fabric entry)
  → RT-09 (KnowledgeRecord requires ObservationRecord as evidence)

RT-09 (KnowledgeRecord)
  → RT-10 (CUM requires KnowledgeRecord inputs)

RT-10 (CUM)
  → RT-11 (CivilizationalDecisionProposal requires valid CUM, PAIR 32)

RT-11 (CivilizationalDecisionProposal)
  → RT-12 (ComplianceVerificationRecord gates Decision formation)
  → RT-16 (Amendment proposal requires full deliberation, §12.8 Step 1)

RT-12 (ComplianceVerificationRecord)
  → RT-11 (CivilizationalDecision sealed after compliance verified)
  → RT-03 (Gate 5 uses RT-12 ComplianceVerificationRecord)

RT-13 (EffectExpectationRecord)
  �� RT-14 (ConsequenceObservationRecord requires EffectExpectationRecord as reference)

RT-14 (DomainUpdateTrigger)
  → RT-15 (domain instances receive DomainUpdateTrigger)
  → RT-08 (consequence re-enters as new observation, PAIR 60)

RT-06 (CoherenceViolationRecord, GCR pipeline)
  → depends on Stage 10 MPW signal from RT-03
  → delivers CoherenceViolationRecord to RT-04
  → delivers DomainCoherenceStatus to RT-15
```

### 6.2 Soft Dependencies (Concurrent-capable)

These can be implemented in parallel after their prerequisites are met:

- RT-04 audit wrapping (can wrap any RT in any order)
- RT-15 domain instance 11-12 (independent of object type introduction)
- RT-06 GCR check wiring (after RT-03 Stage 10 MPW signal exists)

---

## PART 7 ��� RUNTIME IMPLEMENTATION ORDER

The constitutional implementation order derives from the dependency graph and the MVCS (D8 §9) which specifies Identity → Authority → Knowledge → Decision → Action layers.

```
Wave 0 (Pre-wave): Boundary declarations, route collision resolution
  PWA-01: agent-system/lib boundary document
  PWA-02: civilisation.js vs civilization.js route resolution

Wave 1: Constitutional Object Type Introduction (all 16 runtimes)
  Order within wave: RT-01, RT-02, RT-05, RT-07, RT-08, RT-09, RT-10,
                     RT-11, RT-12, RT-13, RT-14, RT-06, RT-03/RT-04

Wave 2: Constitutional Wiring (existing systems emit/consume types)
  Order: RT-05 ChangeRecord → RT-03 Gate 6 → RT-07 PETL Step 2 →
         RT-08 ObservationRecord → RT-09 pipeline → RT-10 CUM →
         RT-11 Proposal → RT-12 Compliance → RT-13 EER → RT-14 COR →
         RT-06 GCR pipeline → RT-03 Stage 10 MPW signal

Wave 3: Missing Runtimes and Full Loop Wiring
  Order: RT-16 amendment pipeline (XL) → RT-08 Observation Boundary →
         RT-15 domains 11-12 → RT-03 full loop wiring

Wave 4: Legacy Remediation
  Order: Duplicate elimination → agent-system consolidation

Wave 5: Verification
  Order: End-to-end loop verification → I1 errata resolution
```

---

## PART 8 — INTERFACE CONTRACTS

### 8.1 RT-03 ← RT-07 (PETL Step 2: Historical Contextualization)

**Contract:** Before PETL advances from PENDING to PREFLIGHT, RT-03 must query RT-07.

```
Interface: lib/memory/gateway.js
  Method: getHistoricalState(timestamp: ISO8601): Promise<HistoricalStateQueryResult>

HistoricalStateQueryResult {
  query_id: UUID,
  query_timestamp: ISO8601,
  historical_layers: {
    episodic: EpisodicEntry[],
    semantic: SemanticEntry[],
    decision: DecisionEntry[]
  },
  temporal_validity_ms: number,
  status: 'VALID' | 'PARTIAL' | 'UNAVAILABLE'
}
```

RT-03 attaches the `HistoricalStateQueryResult.query_id` to the PETL transaction context. Constitutional basis: A1-v1.2 §12.1 Step 3; GAP-03-001.

### 8.2 RT-03 Gate 6 ← RT-05 (Temporal Integrity Check)

**Contract:** Gate 6 queries RT-05 for ChangeRecord history before allowing PETL to advance to COMMITTED.

```
Interface: lib/reality/fabric.js
  Method: getChangeHistory(claimId: string): Promise<ChangeRecord[]>

ChangeRecord {
  change_id: UUID,
  claim_ref: UUID,
  stage_from: ClaimLifecycleStage,
  stage_to: ClaimLifecycleStage,
  transition_vector: object,
  timestamp: ISO8601,
  actor_ref: UUID,
  historical_anchor_ref: UUID | null
}
```

Constitutional basis: A1-v1.2 §8.1 VC-6; C0-MANIFEST §5.2 item 9.

### 8.3 RT-03 Stage 10 → RT-06 (Mandatory Propagation Window Signal)

**Contract:** After every PETL FINALIZED state, RT-03 must signal RT-06 to run GCR evaluation.

```
Interface: lib/coherence/gcr-evaluator.js (new)
  Method: evaluateCommittedObjects(committedObjectIds: UUID[], loopPhase: string): Promise<CoherenceViolationRecord[]>

Signal: async, fire-and-forget (NON-BLOCK per A1 §2.5 definitions)
```

Constitutional basis: A1-v1.2 §12.1 Steps 13+15; GAP-03-003.

### 8.4 RT-08 → RT-03 (Observation Projection as Class A)

**Contract:** All external observations must be submitted as Class A operations through RT-03.

```
Interface: lib/runtime/execution-transaction.js
  Method: begin(req: Request, type: 'OBSERVATION', observationRecord: ObservationRecord): Promise<Transaction>
```

Constitutional basis: A1-v1.2 §12.1 Step 5; D-4 §2.1 KMP.

### 8.5 RT-11 → RT-12 (Decision Proposal for Compliance Verification)

**Contract:** Before RT-11 seals a CivilizationalDecision, it must submit the proposal to RT-12.

```
Interface: lib/decision/compliance-gate.js (new)
  Method: verify(proposal: CivilizationalDecisionProposal): Promise<ComplianceVerificationRecord>

ComplianceVerificationRecord {
  record_id: UUID,
  proposal_ref: UUID,
  verdict: 'COMPLIANT' | 'NON_COMPLIANT',
  violations: string[],
  authority_basis: AIRType[],
  timestamp: ISO8601
}
```

Constitutional basis: A1-v1.2 §12.3 Steps 6-9; PAIR at RT-11↔RT-12.

### 8.6 RT-13 → RT-08 (Post-Action Notification for Consequence Monitoring)

**Contract:** After every action execution (FINALIZED state), RT-13 must notify RT-08 to open consequence monitoring.

```
Interface: lib/observer-health/index.js
  Method: openConsequenceMonitor(projectionRecord: ProjectionRecord): Promise<void>
```

Constitutional basis: A0 §3.14 Responsibility 9; GAP-13-002.

### 8.7 RT-16 Amendment Pipeline Entry Point

**Contract:** Amendment proposals must enter exclusively through RT-11 deliberation, never self-initiated by RT-16.

```
Interface: lib/amendment/pipeline.js (new)
  Method: receive(proposal: AmendmentProposal, sourceDeliberationRef: UUID): Promise<void>
```

Constitutional basis: A1-v1.2 §12.8 Step 1; A1 §14.3 Forbidden: RT-16 self-initiation without RT-11 proposal.

---

## PART 9 — TARGET REPOSITORY ARCHITECTURE

### 9.1 Target Directory Structure

```
Scripts/
├── server.js                    — Express entry point (KEEP — minimal change)
├── middleware/
│   └── civilization-kernel.js   — Constitutional Loop host (REFACTOR — extend phases)
├── lib/
│   ��── constitutional-types/    — NEW: All 35 constitutional object type definitions
│   │   ├���─ index.js             — Registry of all types
│   │   ├── identity-record.js
│   │   ├── authority-certificate.js
│   │   ├── kernel-record.js
│   │   ├── audit-record.js
│   │   ���── change-record.js
│   │   ├── historical-anchor.js
│   │   ├── coherence-violation-record.js
│   │   ├── historical-state-record.js
│   │   ├── observation-record.js
│   │   ├── knowledge-record.js
│   │   ├── cum.js
│   │   ├── civilizational-decision-proposal.js
│   │   ├── civilizational-decision.js
│   │   ├── compliance-verification-record.js
│   │   ├── effect-expectation-record.js
│   │   ├── consequence-observation-record.js
│   │   ├── domain-update-trigger.js
│   │   ├── amendment-proposal.js
│   │   └── [12 more type files]
│   ├── identity/                — NEW: RT-01 identity lifecycle
│   │   ├── record.js            — IdentityRecord CRUD
│   │   └── manifest.js          — IdentityManifest management
│   ├── observation/             — NEW: RT-08 boundary enforcement
│   │   ├── boundary.js          — Observation Boundary gate
│   │   └── record.js            — ObservationRecord factory
│   ├── knowledge/               — NEW: RT-09 knowledge layer
│   │   ├── record.js            — KnowledgeRecord management
│   │   └── evidence-pipeline.js — ObservationRecord→KnowledgeRecord pipeline
│   ├── coherence/               — NEW: RT-06 GCR evaluation
│   │   ├── gcr-evaluator.js     — GCR-1 through GCR-7 checks
│   │   └── domain-status.js     — DomainCoherenceStatus production
│   ├── decision/                — NEW: RT-12 compliance gate
│   │   ├── compliance-gate.js   — ComplianceVerificationRecord
│   │   └── objects.js           — OpenActionRegisterEntry etc.
│   ├── action/                  — NEW: RT-13 effect expectations
│   │   ├── effect-expectation.js— EffectExpectationRecord
│   │   └── projection-record.js — ProjectionRecord
│   ├── reflection/              — NEW: RT-14 consequence records
│   │   └── consequence-record.js— ConsequenceObservationRecord
│   ├── amendment/               — NEW: RT-16 pipeline
│   │   ├── pipeline.js          — 15-step amendment state machine
│   │   ├── classifier.js        — Class I/II/III/IV determination
│   │   └── preservation-audit.js— Class I Preservation Audit gate
│   ├── runtime/                 — REFACTOR: extend existing RT-03/RT-12/RT-13/RT-14
│   │   ├── execution-transaction.js — PETL (add Step 2 + Gate 6 + Stage 10 MPW)
│   │   ├── constitutional-gate.js   — Gates 1-6 (add Gate 6, type all gates)
│   │   ├── decision-lattice.js      — WRAP: emit ComplianceVerificationRecord
│   │   ├── outcome-registry.js      — WRAP: emit ConsequenceObservationRecord
│   │   └── [34 other existing files — KEEP]
│   ├── constitution/            — REFACTOR: keep all, subordinate to constitutional types
│   ├── reality/                 — REFACTOR: emit ChangeRecord, HistoricalAnchor
│   ├── memory/                  — REFACTOR: emit HistoricalStateQueryResult
│   ├── intelligence/            — REFACTOR: SIE wraps into CUM type
│   ├── audit/                   — REFACTOR: decision_ledger wraps into AuditRecord
│   ├── observer-health/         — REFACTOR: sensors emit ObservationRecord
│   └── [remaining lib/ — KEEP]
├── civilisation/
│   ├── consensus.js             — REFACTOR: produce CivilizationalDecisionProposal
│   ├── domain-loader.js         — EXTEND: add DOM-000011, DOM-000012
│   └── [4 other files — KEEP]
├── domains/
│   ├── civilisation/            — KEEP
│   ├── [8 more existing domains — KEEP]
│   ├── [dom-000011]/            — NEW
│   └── [dom-000012]/            — NEW
├── routes/
│   ├── civilization.js          — KEEP (canonical)
│   ├── amendments.js            — NEW: RT-16 API
│   └── [civilisation.js]        — MERGE into civilization.js then DELETE
└── [agent-system/]              — DEFER: boundary declaration pending
```

### 9.2 New Directories Summary

| Directory | Purpose | Constitutional Basis |
|-----------|---------|---------------------|
| `lib/constitutional-types/` | All 35 constitutional object type definitions | D8 §4.2 |
| `lib/identity/` | RT-01 IdentityRecord lifecycle | R1-v1.1 |
| `lib/observation/` | RT-08 ObservationRecord + Boundary | R8-v1.1 |
| `lib/knowledge/` | RT-09 KnowledgeRecord + pipeline | R9-v1.0 |
| `lib/coherence/` | RT-06 GCR evaluator + domain status | R6-v1.1.1 |
| `lib/decision/` | RT-12 compliance gate + register entries | RT12-v1.0 |
| `lib/action/` | RT-13 EffectExpectationRecord + ProjectionRecord | R13-v1.0 |
| `lib/reflection/` | RT-14 ConsequenceObservationRecord | R14-v1.0 |
| `lib/amendment/` | RT-16 15-step amendment pipeline | R16-v1.0 |

---

## PART 10 — PERSISTENCE ARCHITECTURE

### 10.1 Database Ownership by Runtime

Each runtime owns its database tables. No runtime may write to another runtime's tables without RT-03 mediation. Constitutional basis: D8 INV-1 (Constitutional Traceability), INV-3 (Authority Separation).

| Runtime | Owns Tables | Constitutional Object |
|---------|------------|----------------------|
| RT-01 | humans, agents (migrations/037) | IdentityRecord |
| RT-02 | governance_records (partial) | AuthorityValidationRecord |
| RT-03 | execution_transactions (new), governance_records (gate results) | KernelRecord, GateResult |
| RT-04 | apex_audit.ndjson (file), governance_records (partial) | AuditRecord |
| RT-05 | reality_claims, claim_lifecycle_events, reality_health_scores (migration 066), change_records (new) | ChangeRecord, HistoricalAnchor |
| RT-06 | coherence_violation_records (new migration) | CoherenceViolationRecord |
| RT-07 | All memory tables (migrations 009-013): episodic_memory, semantic_memory, procedural_memory, strategic_memory, skill_memory, decision_memory, knowledge_graph, reflexion_events, improvement_events | HistoricalStateRecord |
| RT-08 | observer_registry, calibration_events, sensor_health_scores (migration 067), observation_records (new) | ObservationRecord |
| RT-09 | understanding_scores, understanding_gaps (migration 068), knowledge_records (new) | KnowledgeRecord, EvidenceRecord |
| RT-10 | intelligence tables (migrations 019-024) | CUM (in-memory + cached) |
| RT-11 | consensus_sessions (migration 063) | CivilizationalDecisionProposal |
| RT-12 | compliance_verification_records (new), open_action_register (new) | ComplianceVerificationRecord |
| RT-13 | execution_transactions (EXECUTING state) | EffectExpectationRecord, ProjectionRecord |
| RT-14 | outcome_records (new), consequence_observations (new) | ConsequenceObservationRecord |
| RT-15 | domain_health, domain_agents (migration 039) | DomainCoherenceStatus (receiver) |
| RT-16 | amendments (lib/constitution/amendments.json → new amendments table) | AmendmentProposal, RatifiedAmendmentRecord |

### 10.2 Append-Only Tables

The following tables must be append-only (no UPDATE, no DELETE at the database level). Implementation must enforce this via Postgres Row Level Security or triggers:

1. `apex_audit.ndjson` (RT-04) — already append-only by design
2. Historical state tables (RT-07) — per RT07-INV-1
3. `claim_lifecycle_events` (RT-05) — stage transitions are permanent record
4. `change_records` (RT-05) — ChangeRecord is permanent per D8 PROH-5
5. `amendment` tables (RT-16) — RatifiedAmendmentRecord is permanent per D7 Part 12

### 10.3 New Migrations Required

| Migration | Purpose | Runtime | Wave |
|-----------|---------|---------|------|
| 080_change_records | ChangeRecord + HistoricalAnchor tables | RT-05 | Wave 1 |
| 081_coherence_violations | CoherenceViolationRecord table | RT-06 | Wave 1 |
| 082_observation_records | ObservationRecord + ObservationChannelRecord | RT-08 | Wave 1 |
| 083_knowledge_records | KnowledgeRecord, EvidenceRecord, KnowledgeConflictRecord | RT-09 | Wave 1 |
| 084_compliance_records | ComplianceVerificationRecord, OpenActionRegisterEntry | RT-12 | Wave 1 |
| 085_effect_expectations | EffectExpectationRecord, ProjectionRecord | RT-13 | Wave 1 |
| 086_consequence_observations | ConsequenceObservationRecord, DomainUpdateTrigger | RT-14 | Wave 1 |
| 087_amendments | AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord, AmendmentRejectionRecord | RT-16 | Wave 3 |
| 088_identity_records | IdentityRecord formal schema (extends humans/agents tables) | RT-01 | Wave 2 |
| 089_historical_state | HistoricalStateRecord formal schema (extends memory tables) | RT-07 | Wave 2 |

---

## PART 11 — EVENT ARCHITECTURE

### 11.1 Event Classification

Per A1-v1.2 §2.1: Class A events require RT-03 mediation. Class B events are direct.

**Class A Events (through PETL):**
- New ObservationRecord submitted
- KnowledgeRecord formed
- CUM synthesis completed
- CivilizationalDecision formed
- Action executed
- Amendment submitted

**Class B Events (direct notification, async):**
- RT-03 Stage 10 MPW signal → RT-06 (coherence sweep)
- RT-03 post-commit → RT-04 (audit record)
- RT-03 post-commit → RT-07 (historical state store)
- RT-13 action emission → RT-08 (consequence monitor open)
- RT-16 amendment outcome → all runtimes (notification)

### 11.2 Event Bus Integration

`lib/event-bus.js` is the existing event bus. Constitutional events must be emitted through it using standardized event names:

| Event Name | Emitter | Consumers | Class |
|------------|---------|-----------|-------|
| `constitutional.loop.observation` | RT-08 | RT-09 | A (via PETL) |
| `constitutional.loop.knowledge` | RT-09 | RT-10 | A (via PETL) |
| `constitutional.loop.understanding` | RT-10 | RT-11 | A (via PETL) |
| `constitutional.loop.decision` | RT-11 | RT-12, RT-03 | A (via PETL) |
| `constitutional.loop.action` | RT-13 | RT-08, RT-14 | B (async) |
| `constitutional.loop.consequence` | RT-14 | RT-08 | B (async) |
| `constitutional.stage10.mpw` | RT-03 | RT-06 | B (async) |
| `constitutional.coherence.violation` | RT-06 | RT-04, RT-15 | B (async) |
| `constitutional.amendment.proposed` | RT-16 | RT-04 | B (async) |
| `constitutional.amendment.ratified` | RT-16 | All RT | B (async) |

---

## PART 12 — SERVICE ARCHITECTURE

### 12.1 Service Boundaries

The APEX system is a single Node.js/Express service. The constitutional architecture does not require it to become multiple services. The D8 §3 Constitutional Translation Chain requires only that constitutional behavior is preserved through the implementation; the physical deployment topology is an implementation choice.

**Single-service deployment is constitutionally valid** provided:
- All Class A operations are mediated through the in-process RT-03 equivalent (PETL)
- RT-04 audit writes are durable (file-backed or database-backed, not in-memory only)
- RT-07 historical state is durable (Postgres, not in-memory only)

### 12.2 Process Boundaries

The following process boundaries are constitutionally significant:

| Boundary | Type | Constitutional Implication |
|---------|------|-----------------------------|
| HTTP request/response | Constitutional Loop entry/exit | Each HTTP request may initiate a Constitutional Loop cycle |
| Projection Boundary | RT-13 → External Reality | Crossing requires EffectExpectationRecord + AuditRecord before crossing |
| Observation Boundary | External → RT-08 | All inbound data must produce ObservationRecord before entering the loop |
| Amendment Process | RT-16 boundary | All amendment operations go through 15-step pipeline, not through standard loop |

---

## PART 13 — API ARCHITECTURE

### 13.1 Constitutional API Routing Principles

Per D8 PROH-3 (No Authority Bypass): Every API endpoint that produces a Class A constitutional effect must route through `middleware/civilization-kernel.js` and ultimately through PETL.

**Required routing:** `server.js` → Helmet/CORS/Rate → `civilization-kernel.js` → route handler → `execution-transaction.js`

No route handler may execute constitutional operations that bypass `civilization-kernel.js`.

### 13.2 API Ownership by Runtime

Each runtime owns its API namespace:

| Namespace | Runtime | Current File | Target File |
|-----------|---------|-------------|-------------|
| `/api/identity/*` | RT-01 | (none) | routes/identity.js (new) |
| `/api/authority/*` | RT-02 | (none) | routes/authority.js (new) |
| `/api/reality/*` | RT-05 | routes/reality.js, routes/reality-architecture.js | routes/reality.js (merged) |
| `/api/coherence/*` | RT-06 | (none) | routes/coherence.js (new) |
| `/api/memory/*` | RT-07 | routes/memory.js, routes/intelligence-memory.js | routes/memory.js |
| `/api/observations/*` | RT-08 | routes/observatory.js | routes/observatory.js (rename path) |
| `/api/knowledge/*` | RT-09 | routes/cognitive.js (partial) | routes/knowledge.js (new) |
| `/api/intelligence/*` | RT-10 | routes/intelligence.js | routes/intelligence.js |
| `/api/civilization/*` | RT-11 | routes/civilization.js | routes/civilization.js |
| `/api/decisions/*` | RT-12 | (none) | routes/decisions.js (new) |
| `/api/actions/*` | RT-13 | routes/agents.js (partial) | routes/actions.js (new) |
| `/api/reflection/*` | RT-14 | (none) | routes/reflection.js (new) |
| `/api/domains/*` | RT-15 | routes/civilization.js (partial) | routes/domains.js (new) |
| `/api/amendments/*` | RT-16 | (none) | routes/amendments.js (new) |

### 13.3 API Versioning

All new constitutional endpoints must be versioned. Standard: `/api/v1/[namespace]/[resource]`. Existing endpoints retain their current paths during transition to preserve backward compatibility. New constitutional endpoints start at `/api/v1/`.

---

## PART 14 — CONSTITUTIONAL ENFORCEMENT LOCATIONS

### 14.1 Enforcement Architecture

Constitutional enforcement is distributed across five enforcement zones. Each zone is responsible for a specific class of enforcement. No zone may perform enforcement outside its constitutional mandate.

| Zone | Location | Enforcement Type | Constitutional Basis |
|------|----------|-----------------|---------------------|
| Zone 1 (Identity Gate) | `lib/runtime/constitutional-gate.js` Gate 1 | IdentityRecord validation | D-4 §3.3, RT-01 |
| Zone 2 (Authority Gate) | `lib/runtime/constitutional-gate.js` Gate 3 | AuthorityCertificate validation | D-4 §3.3, RT-02 |
| Zone 3 (Kernel Gate) | `lib/runtime/execution-transaction.js` | All 6 gates + state machine | D-4 §3.3, RT-03 |
| Zone 4 (Coherence Gate) | `lib/coherence/gcr-evaluator.js` (new) | GCR-1 through GCR-7 post-commit | R6-v1.1.1, RT-06 |
| Zone 5 (Compliance Gate) | `lib/decision/compliance-gate.js` (new) | Constitutional compliance pre-decision | RT12-v1.0, RT-12 |
| Zone 6 (Observation Boundary) | `lib/observation/boundary.js` (new) | No external data without ObservationRecord | D-3 RF-A6, RT-08 |

### 14.2 Constitutional Validation Locations

Constitutional validation (post-hoc assessment) is distinct from enforcement (pre-execution blocking):

| Validation | Location | What is Validated |
|-----------|----------|------------------|
| Provenance completeness | `lib/audit/decision_ledger.js` | Every committed object has complete provenance chain |
| Temporal validity | `lib/runtime/execution-transaction.js` (new Gate 6) | No stale objects used in operations |
| Epistemic grounding | `lib/knowledge/record.js` (new) | KnowledgeRecord traces to ObservationRecord |
| Feedback completeness | `lib/runtime/outcome-registry.js` | Every EffectExpectationRecord has a ConsequenceObservationRecord |
| Amendment integrity | `lib/amendment/preservation-audit.js` (new) | Class I amendment passes Preservation Audit |

---

## PART 15 — IMPLEMENTATION CONSTRAINTS

These constraints are fixed by constitutional specification. They may not be changed by implementation decisions. To change any constraint, file an amendment through RT-16.

### 15.1 Immutable Constraints (from D8, D4, A1)

| Constraint | Source | Repository Implication |
|-----------|--------|----------------------|
| All Class A operations pass through RT-03 (KMP) | D-4 §2.1 | All Class A code paths must invoke `execution-transaction.js` |
| Gate sequence 1→2→3→4→5→6 in strict order | D-4 §3.3, CLI-1 | Gate handlers in `constitutional-gate.js` must be non-reorderable |
| RT-04 operations are never gated by RT-03 | D-6 §3.4 AIR-5 | `decision_ledger.js` must never be wrapped in PETL |
| RT-16 is absent from all 10 loop phases | C0-MANIFEST §5.2 item 5; A1-v1.2 | No amendment code in loop phase handlers |
| RT-12 owns ComplianceVerificationRecord; RT-11 owns CivilizationalDecision | C0-MANIFEST §5.2 item 4 | decision-lattice.js is RT-12 infrastructure |
| Gate 6 uses RT-05 ChangeRecord/HistoricalAnchor; NOT RT-07 temporal record | C0-MANIFEST §5.2 item 9 | Gate 6 implementation must query fabric.js, not gateway.js |
| RT-15 has exactly 12 instances | A0 §3.16 | domain-loader.js must have 12 entries |
| DOM-000001 bootstraps first | C0-MANIFEST §5.3 | Domain initialization order in startup.js must respect this |
| Class I amendments require human actors | D7 §12.2 | Amendment pipeline must block at Step 4 for human authorization |

### 15.2 D8 Implementation Invariants (INV-1 through INV-7)

These are unconditional. Violations render the system constitutionally inoperative.

| Invariant | Requirement | Primary Enforcement Location |
|-----------|------------|------------------------------|
| INV-1 Constitutional Traceability | Every constitutional operation must trace to constitutional authority | `lib/audit/decision_ledger.js` provenance chain |
| INV-2 Provenance Preservation | Provenance chains may not be truncated | PROH-4 enforcement in all storage operations |
| INV-3 Authority Separation | Identity ≠ Authority ≠ Execution | `lib/identity/`, `lib/constitution/authority-resistance.js`, PETL separate |
| INV-4 Reality Grounding | Knowledge must trace to ObservationRecord or registered inference | `lib/knowledge/record.js` lineage field required |
| INV-5 Temporal Awareness | No expired object presented as current | `lib/runtime/execution-transaction.js` temporal validity check |
| INV-6 Feedback Requirement | Every action must have a ConsequenceObservationRecord | `lib/runtime/outcome-registry.js` mandatory for all FINALIZED transactions |
| INV-7 Coherence Preservation | Reality Fabric graph structure must remain coherent | `lib/coherence/gcr-evaluator.js` after every commit |

---

## PART 16 — IMPLEMENTATION INVARIANTS

The following invariants hold at all times in the implementation:

| ID | Invariant | Implementation Expression |
|----|-----------|--------------------------|
| II-01 | PETL is the sole path for Class A operations | All HTTP POST/PUT/PATCH routes invoke `execution-transaction.begin()` |
| II-02 | Constitutional gate is fail-closed | `DEFAULT_TIMEOUT_MS=400` in `constitutional-gate.js`; timeout → DENY |
| II-03 | Audit records are append-only | `decision_ledger.js` has no UPDATE/DELETE operations |
| II-04 | Historical state records are append-only | Memory tables have append-only enforcement (Postgres RLS) |
| II-05 | ChangeRecord is produced on every reality_claims mutation | `fabric.advanceClaim()` always produces ChangeRecord |
| II-06 | ObservationBoundary is enforced before fabric entry | `lib/observation/boundary.js` validates before `lib/reality/fabric.js` |
| II-07 | EffectExpectationRecord precedes action execution | Produced at COMMITTED state before EXECUTING |
| II-08 | RT-16 operates outside the standard loop | No RT-16 code in civilization-kernel.js loop handlers |
| II-09 | RT-04 does not gate | decision_ledger.js is never called from inside PETL preflight |
| II-10 | Provenance chain is unbroken | Every constitutional object has a `provenance_ref` field pointing to predecessor |
| II-11 | DOM-000001 initializes first | startup.js domain initialization order is fixed |
| II-12 | CUM invalidation notifies RT-11 | SIE output invalidation triggers PAIR 32 notification |

---

## PART 17 — FORBIDDEN IMPLEMENTATION PATTERNS

These patterns are prohibited. Any pull request implementing these patterns must be rejected.

| Pattern | Constitutional Basis | Alternative |
|---------|---------------------|-------------|
| Direct `lib/reality/fabric.js` write without PETL | D-4 §2.1 KMP | Route through `execution-transaction.js` |
| Bypassing `civilization-kernel.js` for API routes | D-4 §2.1 KMP | All routes must be mounted after `civilization-kernel.js` |
| RT-16 code in loop phase handlers | A1-v1.2; C0-MANIFEST §5.2 item 5 | RT-16 uses §12.8 pipeline only |
| Deleting audit records | D8 PROH-5 | Audit records are permanent; archive-only |
| Creating new constitutional object categories | D8 PROH-1 | Use existing constitutional types; extend through RT-16 |
| Storing ungrounded claims as KnowledgeRecord | D8 PROH-6, INV-4 | All KnowledgeRecord must reference ObservationRecord or inference protocol |
| Agent-level authority bypass via admin interfaces | D8 PROH-8 | All authority through AIR-1–5 registered assignments |
| RT-11 using its own prior Decision as deliberation evidence | A1-v1.2 §11.2 FR-3 | New deliberation cycle with fresh evidence |
| RT-03 gating its own operations | A1-v1.2 §11.2 FR-1 | RT-03 is self-validating; no recursive gating |
| Mutable HistoricalStateRecord | RT07-INV-1 | Append-only; REJECTED status marking only |
| `agent-system/episodic-memory.js` used for new code | OVL-004 | Use `lib/memory/episodic-memory-pg.js` |
| Two reality loops active simultaneously | OVL-013 | Use `lib/reality/reality_loop.js` exclusively |
| Class I amendment automated approval | D7 §12.2; C0-MANIFEST §5.3 | Human authorization required at pipeline Step 4 |
| RT-15 cross-domain mutation without KMP | A1-v1.2 §14.3 | Cross-domain mutations via RT-03 |

---

## PART 18 — CONSTITUTIONAL PRESERVATION REQUIREMENTS

These are specific elements of the existing implementation that MUST be preserved. Altering them constitutes a constitutional violation requiring RT-16 amendment.

| Element | Location | Why Preserved |
|---------|---------|--------------|
| PETL 5-state machine (PENDING/PREFLIGHT/COMMITTED/EXECUTING/FINALIZED/ABORTED) | `lib/runtime/execution-transaction.js` | This IS the RT-03 operation lifecycle (D-4 §3.3) |
| 6-gate sequence (authority→risk→modification→deception→confabulation→attestation) | `lib/runtime/constitutional-gate.js` | This IS the Gate 1-6 sequence; reordering violates CLI-1 |
| 13-stage reality claim lifecycle | `lib/reality/fabric.js` | This IS the RT-05 claim lifecycle (D-3 Reality Fabric) |
| Append-only audit ledger | `lib/audit/decision_ledger.js` | This IS RT-04 constitutional audit permanence (D8 PROH-5) |
| 13-layer memory architecture | `lib/memory/gateway.js` | This IS the RT-07 historical state architecture |
| 9-dimension reality health | `lib/reality/fabric.js scoreRealityHealth()` | This IS the RT-05 health model (D-3) |
| Consensus quorum 5-of-9 | `civilisation/consensus.js` | This IS the RT-11 constitutional quorum |
| Constitutional gate fail-closed (400ms timeout→DENY) | `lib/runtime/constitutional-gate.js` | Operational expression of D-4 §3.3 fail-safe |
| DOM-000001 through DOM-000010 domain structure | `domains/` | RT-15 instances; may not be deleted without RT-16 |
| `amendments.json` location | `lib/constitution/amendments.json` | Constitutional record location; relocating requires amendment |

---

*End of I1-IMPLEMENTATION-ARCHITECTURE.md*
*Document ID: I1-ARCHITECTURE | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
