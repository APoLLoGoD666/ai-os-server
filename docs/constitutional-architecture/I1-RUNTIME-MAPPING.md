# I1 — RUNTIME MAPPING
## APEX Constitutional Architecture — Runtime-to-Repository Map

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I1-RUNTIME-MAPPING |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | A0-v1.1.1 (all §3.N runtime specifications); A1-v1.2 (PAIRs, permission matrix); I1-ARCHITECTURE (§§7–10) |
| I0 Basis | I0-IMPLEMENTATION-GAP-REGISTER.md; I0-IMPLEMENTATION-BASELINE-AUDIT.md |

**Purpose:** For every constitutional runtime RT-01 through RT-16, this document specifies: current implementation state, missing implementation, repository location (current and target), files responsible, database ownership, constitutional object type ownership, API ownership, memory ownership, events produced and consumed, PAIR-based dependencies and dependents, gap register entries, migration steps, and completion criteria.

Implementers must read this document alongside I1-ARCHITECTURE before modifying any runtime-related module.

---

## MAPPING CONVENTIONS

**Implementation Status:**
- `PRESENT` — constitutional behavior exists; may need typing
- `PARTIAL` — some behavior exists; gaps remain
- `STUB` — placeholder only; no constitutional behavior
- `MISSING` — no implementation exists

**Object Status:**
- `[NEW]` — constitutional object type does not exist in codebase; must be created in `lib/constitutional-types/`
- `[WRAP]` — object exists under a different name; introduce constitutional type as wrapper/schema
- `[EXISTS]` — constitutional behavior present; formal typing needed
- `[FORMAL]` — fully introduced and typed

---

## RT-01 — IDENTITY RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-01 |
| Canonical Name | Identity Runtime |
| Constitutional Authority | A0-v1.1.1 §3.1; R1-v1.1 |
| Tier | Tier 1 — Foundation Layer |
| A1 Loop Phase | Phase 0 (Constitutional Foundation — present in all phases) |

### Current Implementation Status: PARTIAL

The Identity Runtime has no dedicated module. Identity is handled implicitly through:
- `lib/memory/access-controller.js` — actor identity lookup for access decisions
- `middleware/civilization-kernel.js` PHASE 2 — identity hydration from request context
- `agent-system/` — pre-constitutional actor profiles (OVL-019)
- Postgres tables `humans` and `agents` (migration 037) — raw identity storage

No formal `IdentityRecord` object is produced. No `StructuralIdentityRecord`, `SemanticIdentityRecord`, or `ReferentialIdentityRecord` exists. Identity is treated as a database row, not a constitutional object.

### Missing Implementation
1. Formal `IdentityRecord` constitutional object type
2. `lib/identity/` module (identity lifecycle management)
3. `StructuralIdentityRecord`, `SemanticIdentityRecord`, `ReferentialIdentityRecord` types
4. `IdentityConflictRecord` production when identity ambiguity detected
5. `IdentityEndRecord` production when identity lifecycle terminates
6. `ActorProfile` formal type (wrapping `humans`/`agents` rows)
7. Migration 088 (IdentityRecord formal schema extension)

### Repository Location
| | Location |
|-|----------|
| Current | `lib/memory/access-controller.js`, `middleware/civilization-kernel.js` (PHASE 2), `migrations/037_*.sql` |
| Target | `lib/identity/` (new), `lib/constitutional-types/identity-record.js` (new) |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/memory/access-controller.js` | Identity lookup | REFACTOR — emit formal ActorProfile |
| `middleware/civilization-kernel.js` | Identity hydration | REFACTOR — call lib/identity/ |
| `migrations/037_*.sql` | humans/agents tables | KEEP |
| `lib/identity/record.js` | IdentityRecord CRUD | CREATE |
| `lib/identity/manifest.js` | IdentityManifest management | CREATE |
| `lib/constitutional-types/identity-record.js` | Type definition | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `humans` | KEEP | Registered human actors |
| `agents` | KEEP | Registered agent actors |
| `identity_records` (migration 088) | NEW | Formal IdentityRecord table extending above |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| ActorProfile | [WRAP] humans/agents rows | Wave 1 |
| ExternalReference | [NEW] | Wave 1 |
| IdentityConflictRecord | [NEW] | Wave 1 |
| IdentityEndRecord | [NEW] | Wave 1 |
| StructuralIdentityRecord | [NEW] | Wave 1 |
| SemanticIdentityRecord | [NEW] | Wave 1 |
| ReferentialIdentityRecord | [NEW] | Wave 1 |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/identity/*` | None | `routes/identity.js` (new) | NEW |

### Memory Ownership
RT-01 contributes identity state to RT-07 (HistoricalStateRecord). Identity history stored in `episodic_memory` layer (Layer 0 — FOUNDER context). RT-01 does not own memory tables; it writes to RT-07-owned tables via RT-03.

### Events Produced
| Event | Trigger | Consumer |
|-------|---------|----------|
| `identity.established` | New actor registered | RT-02 (authority assignment) |
| `identity.conflicted` | IdentityConflictRecord produced | RT-03 (Gate 1 reject path), RT-04 (audit) |
| `identity.ended` | IdentityEndRecord produced | RT-03 (DENY path), RT-04 |

### Events Consumed
None. RT-01 is a source runtime; it does not consume events from other runtimes. It receives registration requests from external actors.

### PAIR Dependencies (Incoming)
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 01 | RT-02 | GATE-BLOCK: RT-02 must confirm no authority-without-identity conflict before identity operations proceed |
| PAIR 28 | RT-07 | Historical contextualization: RT-07 delivers prior identity state for continuity check |

### PAIR Dependents (Outgoing)
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 02 | RT-03 | Gate 1: IdentityRecord submitted to RT-03 for Gate 1 validation |
| PAIR 01 | RT-02 | ActorProfile delivered for authority assignment |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| (none critical) | — | — |
| [implied] | MEDIUM | No formal IdentityRecord object type exists |
| [implied] | MEDIUM | No lib/identity/ module exists |

### Migration Steps
1. **Wave 1, Step 1:** Create `lib/constitutional-types/identity-record.js` defining ActorProfile, StructuralIdentityRecord, SemanticIdentityRecord, ReferentialIdentityRecord, IdentityConflictRecord, IdentityEndRecord, ExternalReference schemas
2. **Wave 2, Step 1:** Create `lib/identity/record.js` wrapping `humans`/`agents` table queries with ActorProfile type
3. **Wave 2, Step 2:** Refactor `lib/memory/access-controller.js` to call `lib/identity/record.js` and return ActorProfile
4. **Wave 2, Step 3:** Refactor `middleware/civilization-kernel.js` PHASE 2 to hydrate formal ActorProfile
5. **Wave 2, Step 4:** Create migration 088 adding `identity_records` formal schema table

### Completion Criteria
- [ ] `ActorProfile` is a formal constitutional type returned by `lib/identity/record.js`
- [ ] `middleware/civilization-kernel.js` PHASE 2 attaches `ActorProfile` (not raw database row) to request context
- [ ] `IdentityConflictRecord` is produced when identity lookup returns ambiguous results
- [ ] Migration 088 applied; `identity_records` table exists
- [ ] Constitutional gate Gate 1 validates a formal `ActorProfile` object

---

## RT-02 — AUTHORITY RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-02 |
| Canonical Name | Authority Runtime |
| Constitutional Authority | A0-v1.1.1 §3.2; D6 §4.2–4.7 |
| Tier | Tier 1 — Foundation Layer |
| A1 Loop Phase | Phase 0 (Constitutional Foundation) |

### Current Implementation Status: PARTIAL

Authority behavior exists in `lib/constitution/authority-resistance.js` and `lib/runtime/constitutional-gate.js` (Gate 3 authority check). However:
- No formal `DelegationRecord`, `AuthorityClaim`, `AuthorityScope` objects exist
- Authority validation at Gate 3 does not produce a formal `AuthorityValidationRecord`
- D6 §4.7 Authority Integrity Rules (AIR-1 through AIR-5) are not explicitly enforced as named rules

### Missing Implementation
1. Formal `DelegationRecord`, `AuthorityClaim`, `AuthorityRevocationRecord`, `AuthorityConflictRecord`, `AuthorityScope` types
2. Gate 3 producing a formal `AuthorityValidationRecord`
3. D6 AIR-1 through AIR-5 explicitly implemented and named
4. `routes/authority.js` (new API)

### Repository Location
| | Location |
|-|----------|
| Current | `lib/constitution/authority-resistance.js`, `lib/runtime/constitutional-gate.js` (Gate 3) |
| Target | `lib/constitution/` expanded; `lib/constitutional-types/authority-certificate.js` |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/constitution/authority-resistance.js` | Authority resistance rules | REFACTOR — emit formal types |
| `lib/runtime/constitutional-gate.js` | Gate 3 authority check | REFACTOR — produce AuthorityValidationRecord |
| `lib/constitutional-types/authority-certificate.js` | Type definitions | CREATE |
| `routes/authority.js` | RT-02 API | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `governance_records` (partial) | KEEP/REFACTOR | Authority validation results; currently shared with RT-03 |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| DelegationRecord | [NEW] | Wave 1 |
| AuthorityClaim | [NEW] | Wave 1 |
| AuthorityRevocationRecord | [NEW] | Wave 1 |
| AuthorityConflictRecord | [NEW] | Wave 1 |
| AuthorityScope | [NEW] | Wave 1 |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/authority/*` | None | `routes/authority.js` (new) | NEW |

### Events Produced
| Event | Trigger | Consumer |
|-------|---------|----------|
| `authority.granted` | DelegationRecord created | RT-03 (Gate 3 pre-load) |
| `authority.revoked` | AuthorityRevocationRecord produced | RT-03 (DENY path), RT-04 |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `identity.established` | RT-01 | New identity triggers authority scope initialization |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 01 | RT-01 | GATE-BLOCK: identity required before authority scope |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 03 | RT-03 | AuthorityClaim delivered to Gate 3 |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| [implied] | HIGH | No formal DelegationRecord exists |
| [implied] | MEDIUM | D6 AIR-1–5 not explicitly named in implementation |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/authority-certificate.js` with all 5 authority object type definitions
2. **Wave 2:** Refactor Gate 3 in `constitutional-gate.js` to produce formal `AuthorityValidationRecord`
3. **Wave 2:** Refactor `authority-resistance.js` to emit named AIR-1–5 violations

### Completion Criteria
- [ ] `DelegationRecord` and `AuthorityClaim` are formal types
- [ ] Gate 3 produces `AuthorityValidationRecord` attached to PETL context
- [ ] AIR-1 through AIR-5 are each implemented as named checks in `authority-resistance.js`

---

## RT-03 — KERNEL RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-03 |
| Canonical Name | Kernel Runtime |
| Constitutional Authority | A0-v1.1.1 §3.3; D-4 §2–3; CLI-1 through CLI-4 |
| Tier | Tier 1 — Foundation Layer |
| A1 Loop Phase | Phase 0 (Constitutional Foundation, Gate keeper for all Class A) |

### Current Implementation Status: PARTIAL (3 critical gaps)

The Kernel Runtime has the strongest existing implementation:
- `lib/runtime/execution-transaction.js` (PETL) — implements D-4 §3.3 operation lifecycle; 5-state machine
- `middleware/civilization-kernel.js` — Constitutional Loop host; 7 phases
- `lib/runtime/constitutional-gate.js` — Gates 1–5 (Gate 6 missing)

Three critical gaps remain (see Gap Register).

### Missing Implementation
1. **GAP-03-001:** PETL Step 2 Historical Contextualization — no RT-07 query before PREFLIGHT
2. **GAP-03-002:** Gate 6 (Temporal Integrity) — not implemented; using governance attestation as a proxy for the wrong check
3. **GAP-03-003:** Stage 10 MPW (Mandatory Propagation Window) signal to RT-06 after FINALIZED state
4. Formal `KernelOperationManifest`, `RejectionRecord`, `AccountabilityRecord` types

### Repository Location
| | Location |
|-|----------|
| Current | `lib/runtime/execution-transaction.js`, `middleware/civilization-kernel.js`, `lib/runtime/constitutional-gate.js` |
| Target | Same + `lib/constitutional-types/kernel-record.js` (new) |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/runtime/execution-transaction.js` | PETL state machine (RT-03 core) | REFACTOR — add Step 2 + Stage 10 MPW |
| `middleware/civilization-kernel.js` | Constitutional Loop host | REFACTOR — add Phase completeness |
| `lib/runtime/constitutional-gate.js` | Gates 1–6 | REFACTOR — add Gate 6 |
| `lib/constitutional-types/kernel-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `governance_records` | KEEP | Gate validation results (sync for mutating requests) |
| `execution_transactions` (new) | NEW | PETL transaction log; formal KernelOperationManifest |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| RejectionRecord | [NEW] | Wave 1 |
| AccountabilityRecord | [NEW] | Wave 1 |
| RollbackProvenanceRecord | [NEW] | Wave 1 |
| SuspensionNotice | [NEW] | Wave 1 |
| CoherenceResolutionEvent (CRE) | [NEW] (shared with RT-06) | Wave 1 |
| CoherenceConflictRecord (CCR) | [NEW] (shared with RT-06) | Wave 1 |
| KernelOperationManifest | [NEW] | Wave 1 |

### API Ownership
None. RT-03 is an internal runtime with no public API. It is invoked exclusively via `middleware/civilization-kernel.js` → `execution-transaction.js`.

### Memory Ownership
RT-03 writes operational records to RT-07 (episodic memory) via the post-response hook in `civilization-kernel.js`. This write is Class B (async) and does not pass through PETL (RT-03 does not gate itself, per Part 15 Immutable Constraint row 3).

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.stage10.mpw` | Every PETL FINALIZED state | RT-06 (GCR evaluation) | B (async) |
| `constitutional.loop.observation` | Observation Class A operation committed | RT-09 | A (via PETL) |
| `gate.rejected` | Any Gate 1–6 DENY | RT-04 (audit), RT-01/RT-02 (identity/authority) | B |

### Events Consumed
All Class A operations from all runtimes pass through RT-03 for gate evaluation. RT-03 is the sink for all constitutional operations.

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 02 | RT-01 | Gate 1: IdentityRecord validation |
| PAIR 03 | RT-02 | Gate 3: AuthorityClaim validation |
| PAIR 07 | RT-05 | Gate 2: Object state check; Gate 6: ChangeRecord history |
| PAIR 08 | RT-07 | Step 2: HistoricalStateQueryResult |
| PAIR 09 | RT-09 | Gate 4: Epistemic validation |
| PAIR 10 | RT-12 | Gate 5: ComplianceVerificationRecord |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 15 | RT-05 | Primary kernel relationship: atomic commit to reality fabric |
| PAIR 16 | RT-06 | Stage 10 MPW signal after commit |
| PAIR 61 | RT-16 | Amendment commit passes through all 6 gates |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-03-001 | CRITICAL | PETL Step 2 does not query RT-07 for historical contextualization |
| GAP-03-002 | CRITICAL | Gate 6 not wired to RT-05 ChangeRecord/HistoricalAnchor |
| GAP-03-003 | HIGH | No Stage 10 MPW signal sent to RT-06 after FINALIZED |

### Migration Steps
1. **Wave 2, Task W2-01:** Add `getHistoricalState(timestamp)` method to `lib/memory/gateway.js` returning formal `HistoricalStateQueryResult`
2. **Wave 2, Task W2-02:** In `execution-transaction.js`, at PENDING→PREFLIGHT transition, call `gateway.getHistoricalState()` and attach result to transaction context (fixes GAP-03-001)
3. **Wave 2, Task W2-03:** Add `getChangeHistory(claimId)` to `lib/reality/fabric.js` returning `ChangeRecord[]`
4. **Wave 2, Task W2-04:** In `constitutional-gate.js`, implement Gate 6 calling `fabric.getChangeHistory()` (fixes GAP-03-002)
5. **Wave 2, Task W2-05:** In `execution-transaction.js`, at EXECUTING→FINALIZED transition, emit `constitutional.stage10.mpw` event (fixes GAP-03-003)

### Completion Criteria
- [ ] PETL Step 2 queries `lib/memory/gateway.js` and attaches `HistoricalStateQueryResult.query_id` to transaction context
- [ ] Gate 6 in `constitutional-gate.js` calls `fabric.getChangeHistory()` and blocks if temporal integrity fails
- [ ] `constitutional.stage10.mpw` event emitted after every FINALIZED state transition
- [ ] Formal `KernelOperationManifest` produced for every completed PETL transaction
- [ ] All 6 gates execute in strict sequence 1→2→3→4→5→6 (verified by test)

---

## RT-04 — CONSTITUTIONAL AUDIT RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-04 |
| Canonical Name | Constitutional Audit Runtime |
| Constitutional Authority | A0-v1.1.1 §3.4; D6 §3.4 AIR-5 (Audit Independence) |
| Tier | Tier 1 — Foundation Layer (cross-cutting) |
| A1 Loop Phase | Phase 0 (audits all phases; never inside any phase) |

### Current Implementation Status: PARTIAL

`lib/audit/decision_ledger.js` implements append-only audit logging. `apex_audit.ndjson` is the file-backed audit store. However:
- No formal `ConstitutionalAuditRecord` type
- No `ConstitutionalComplianceAttestation` or `ConstitutionalViolationRecord` types
- `PreservationAuditRecord` (required for RT-16 Class I amendments) does not exist

**Constitutional constraint:** RT-04 is NEVER gated by RT-03 (D6 §3.4 AIR-5 Audit Independence). `decision_ledger.js` must not be inside PETL preflight.

### Missing Implementation
1. Formal `ConstitutionalAuditRecord` wrapping current `decision_ledger.js` records
2. `ConstitutionalComplianceAttestation` (produced after compliance verification)
3. `ConstitutionalViolationRecord` (produced when PROH-1 through PROH-9 violated)
4. `PreservationAuditRecord` (required by RT-16 Class I amendment pipeline)
5. `AuditScope` type

### Repository Location
| | Location |
|-|----------|
| Current | `lib/audit/decision_ledger.js`, `apex_audit.ndjson` |
| Target | Same + `lib/constitutional-types/audit-record.js` (new) |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/audit/decision_ledger.js` | Append-only audit log (RT-04 core) | REFACTOR — emit formal types |
| `apex_audit.ndjson` | Audit file store | KEEP (append-only enforced) |
| `lib/constitutional-types/audit-record.js` | Type definitions | CREATE |
| `lib/amendment/preservation-audit.js` | PreservationAuditRecord for RT-16 | CREATE (Wave 3) |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `apex_audit.ndjson` (file) | KEEP | Primary append-only audit store |
| `governance_records` (partial) | KEEP | Gate validation audit rows |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| ConstitutionalAuditRecord | [WRAP] decision_ledger rows | Wave 1 |
| ConstitutionalComplianceAttestation | [NEW] | Wave 1 |
| ConstitutionalViolationRecord | [NEW] | Wave 1 |
| AuditScope | [NEW] | Wave 1 |
| PreservationAuditRecord | [NEW] | Wave 3 (RT-16 dependency) |

### API Ownership
Read-only audit query API. No write API (RT-04 never accepts external write commands).

### Events Produced
None. RT-04 is a pure observer — it reads all events and writes audit records. It does not emit events to other runtimes.

### Events Consumed
All constitutional events. RT-04 observes:
- All `gate.rejected` events (from RT-03)
- All `constitutional.loop.*` events
- `constitutional.amendment.proposed` and `constitutional.amendment.ratified` (from RT-16)
- `constitutional.coherence.violation` (from RT-06)

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 60 | RT-16 | PreservationAuditRecord required before Class I amendment proceeds (BLOCK) |

### PAIR Dependents
None — RT-04 is never depended upon by other runtimes for gate passage. AIR-5 requires it to operate independently.

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-04-001 (implied) | MEDIUM | No formal ConstitutionalAuditRecord type |
| GAP-04-002 (implied) | HIGH | PreservationAuditRecord not implemented (blocks RT-16) |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/audit-record.js` with all 5 type definitions
2. **Wave 2:** Refactor `decision_ledger.js` to wrap output in formal `ConstitutionalAuditRecord` type
3. **Wave 3:** Create `lib/amendment/preservation-audit.js` producing `PreservationAuditRecord` for RT-16 pipeline

### Completion Criteria
- [ ] `decision_ledger.js` produces `ConstitutionalAuditRecord` objects
- [ ] `decision_ledger.js` is never called from within PETL preflight stages (II-09)
- [ ] `PreservationAuditRecord` produced and verified for Class I amendment attempts
- [ ] `ConstitutionalViolationRecord` produced when any PROH-1–9 violation is detected

---

## RT-05 — REALITY FABRIC RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-05 |
| Canonical Name | Reality Fabric Runtime |
| Constitutional Authority | A0-v1.1.1 §3.5; D-3 (Reality Fabric); R3-v1.1 |
| Tier | Tier 2 — Reality/Memory/Coherence Layer |
| A1 Loop Phase | Phase 7 (Action — receives committed objects); present as substrate in all phases |

### Current Implementation Status: PARTIAL (1 critical gap)

`lib/reality/fabric.js` (9.6K) is the strongest implementation in the codebase. It implements:
- 13-stage claim lifecycle (potential→evolved)
- 9-dimension reality health scoring
- `claimReality()`, `advanceClaim()`, `scoreRealityHealth()`
- Reality loop: `lib/reality/reality_loop.js`
- Reality health: `lib/reality/reality_health.js`

Critical gap: `ChangeRecord` and `HistoricalAnchor` not produced, preventing Gate 6 from functioning.

### Missing Implementation
1. **GAP-05-001:** `ChangeRecord` not produced on `advanceClaim()`
2. **GAP-05-001:** `HistoricalAnchor` not maintained
3. `getChangeHistory(claimId)` method for Gate 6 use
4. `FabricFoundingRoot` formal type
5. `ObjectLifecycleRecord` wrapping the 13-stage transitions

### Repository Location
| | Location |
|-|----------|
| Current | `lib/reality/fabric.js`, `lib/reality/reality_loop.js`, `lib/reality/reality_health.js`, `lib/reality/reality-bridge.js` |
| Target | Same + `lib/constitutional-types/change-record.js`, `lib/constitutional-types/historical-anchor.js` |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/reality/fabric.js` | Reality Fabric core (RT-05) | REFACTOR — emit ChangeRecord/HistoricalAnchor |
| `lib/reality/reality_loop.js` | Reality loop | KEEP (one loop rule per OVL-013) |
| `lib/reality/reality_health.js` | 9-dimension health | KEEP (preserved per Part 18) |
| `lib/reality/reality-bridge.js` | Bridge module | KEEP |
| `lib/constitutional-types/change-record.js` | ChangeRecord + HistoricalAnchor types | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `reality_claims` | KEEP | Primary claim store |
| `claim_lifecycle_events` | KEEP (append-only) | Stage transition record |
| `reality_health_scores` | KEEP | 9-dimension health (migration 066) |
| `change_records` | NEW (migration 080) | ChangeRecord store (Gate 6 source) |
| `historical_anchors` | NEW (migration 080) | HistoricalAnchor per claim |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| All URO objects | [EXISTS] as reality_claims rows | Wave 1 (typing) |
| FabricFoundingRoot | [NEW] | Wave 1 |
| ObjectLifecycleRecord | [WRAP] claim_lifecycle_events rows | Wave 1 |
| ChangeRecord | [NEW] | Wave 2 (critical for Gate 6) |
| HistoricalAnchor | [NEW] | Wave 2 (critical for Gate 6) |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/reality/*` | `routes/reality.js`, `routes/reality-architecture.js` | `routes/reality.js` (merged) | REFACTOR |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `fabric.claim.advanced` | advanceClaim() completes | RT-06 (coherence check) | B |
| `fabric.claim.committed` | PETL EXECUTING writes to fabric | RT-04 (audit) | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| All Class A committed operations | RT-03 (PETL EXECUTING state) | Object written to reality_claims |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 15 | RT-03 | RT-03 writes to RT-05 as primary kernel relationship (atomic commit) |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 07 (Gate 2) | RT-03 | Object state check before commit |
| PAIR 07 (Gate 6) | RT-03 | ChangeRecord history for temporal integrity check |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-05-001 | CRITICAL | ChangeRecord and HistoricalAnchor not produced by advanceClaim() |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/change-record.js` defining `ChangeRecord` and `HistoricalAnchor` schemas
2. **Wave 2, W2-03:** Add `change_records` and `historical_anchors` tables (migration 080)
3. **Wave 2, W2-04:** Modify `fabric.advanceClaim()` to produce and persist a `ChangeRecord` on every stage transition
4. **Wave 2, W2-05:** Add `fabric.getChangeHistory(claimId)` method returning `ChangeRecord[]`
5. **Wave 2, W2-06:** Wire Gate 6 in `constitutional-gate.js` to call `fabric.getChangeHistory()`

### Completion Criteria
- [ ] Every call to `fabric.advanceClaim()` produces a `ChangeRecord` persisted to `change_records` table
- [ ] `fabric.getChangeHistory(claimId)` returns full ChangeRecord history for a given claim
- [ ] `HistoricalAnchor` updated on each claim transition
- [ ] Migration 080 applied
- [ ] Gate 6 blocking on temporal integrity failures using ChangeRecord data

---

## RT-06 — COHERENCE RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-06 |
| Canonical Name | Coherence Runtime |
| Constitutional Authority | A0-v1.1.1 §3.6; R6-v1.1.1 |
| Tier | Tier 2 — Reality/Memory/Coherence Layer |
| A1 Loop Phase | Phase 10 (Updated Understanding — coherence evaluation post-commit) |

### Current Implementation Status: STUB/MISSING

No dedicated RT-06 module exists. Limited coherence checks exist inside `lib/constitution/` and `lib/runtime/constitutional-gate.js` but these do not constitute a Coherence Runtime. The 7-register GCR (Global Coherence Register) check is not implemented. No `CoherenceViolationRecord` objects are produced.

### Missing Implementation
1. `lib/coherence/gcr-evaluator.js` — GCR-1 through GCR-7 checks
2. `lib/coherence/domain-status.js` — DomainCoherenceStatus production
3. `CoherenceViolationRecord`, `CRE`, `CCR`, `CUMDegradationRecord`, `DomainCoherenceStatus` types
4. Stage 10 MPW receiver (triggered by RT-03 `constitutional.stage10.mpw` event)
5. Migration 081

### Repository Location
| | Location |
|-|----------|
| Current | None (fragments in lib/constitution/) |
| Target | `lib/coherence/` (new directory) |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/coherence/gcr-evaluator.js` | GCR-1–7 evaluation engine | CREATE |
| `lib/coherence/domain-status.js` | DomainCoherenceStatus factory | CREATE |
| `lib/constitutional-types/coherence-violation-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `coherence_violation_records` | NEW (migration 081) | Append-only coherence violation log |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| CoherenceViolationRecord | [NEW] | Wave 1 |
| CoherenceResolutionEvent (CRE) | [NEW] (shared with RT-03) | Wave 1 |
| CoherenceConflictRecord (CCR) | [NEW] (shared with RT-03) | Wave 1 |
| CoherenceRegister (7 dimensions) | [NEW] | Wave 2 (runtime) |
| CUMDegradationRecord | [NEW] | Wave 2 |
| DomainCoherenceStatus | [NEW] | Wave 2 |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/coherence/*` | None | `routes/coherence.js` (new) | NEW |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.coherence.violation` | GCR check fails | RT-04 (audit), RT-15 (domain notification) | B |
| `coherence.degradation` | CUMDegradationRecord produced | RT-11 (understanding update) | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.stage10.mpw` | RT-03 | Triggers GCR evaluation of committed objects |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 16 | RT-03 | Stage 10 MPW signal initiates GCR sweep |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| — | RT-04 | CoherenceViolationRecord delivered for audit |
| — | RT-15 | DomainCoherenceStatus delivered to domain instances |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-06-001 (implied) | HIGH | No Coherence Runtime implementation exists |
| GAP-03-003 | HIGH | Stage 10 MPW signal not sent (RT-03 side of this gap) |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/coherence-violation-record.js`
2. **Wave 2:** Create `lib/coherence/gcr-evaluator.js` with GCR-1 through GCR-7 checks
3. **Wave 2:** Create `lib/coherence/domain-status.js`
4. **Wave 2:** Create migration 081 adding `coherence_violation_records` table
5. **Wave 2:** Wire `constitutional.stage10.mpw` event handler in `lib/coherence/gcr-evaluator.js`

### Completion Criteria
- [ ] `lib/coherence/gcr-evaluator.js` exists and implements GCR-1 through GCR-7
- [ ] `CoherenceViolationRecord` produced and persisted on every GCR failure
- [ ] RT-06 is triggered by every RT-03 Stage 10 MPW signal
- [ ] `DomainCoherenceStatus` delivered to RT-15 domain instances after each evaluation
- [ ] Migration 081 applied

---

## RT-07 — HISTORICAL MEMORY RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-07 |
| Canonical Name | Historical Memory Runtime |
| Constitutional Authority | A0-v1.1.1 §3.7; RT07-v1.0 |
| Tier | Tier 2 — Reality/Memory/Coherence Layer |
| A1 Loop Phase | Present in all phases as historical context provider |

### Current Implementation Status: PARTIAL (1 critical gap)

`lib/memory/gateway.js` (27.4K) implements 13-layer memory architecture. This is the strongest RT-07 analog in the codebase. Layers 0–11 plus founder context, lessons, and policies are assembled by `getContext()`. All memory tables exist and are operational.

Critical gap: `HistoricalStateQueryResult` as a formal constitutional object type does not exist. RT-03 cannot query RT-07 for Step 2 without a typed interface.

### Missing Implementation
1. **GAP-07-001:** `HistoricalStateQueryResult` formal type
2. `getHistoricalState(timestamp)` method on gateway
3. `HistoricalStateRecord`, `ProvenanceChain`, `MemoryLifecycleRecord` formal types
4. Migration 089 (HistoricalStateRecord formal schema)

### Repository Location
| | Location |
|-|----------|
| Current | `lib/memory/gateway.js`, `lib/memory/episodic-memory-pg.js`, `lib/memory/semantic-memory-pg.js`, `lib/memory/decision-memory-pg.js`, etc. |
| Target | Same + `lib/constitutional-types/historical-state-record.js` |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/memory/gateway.js` | 13-layer memory hub (RT-07 core) | REFACTOR — add getHistoricalState() |
| `lib/memory/episodic-memory-pg.js` | Layer 0 episodic | KEEP |
| `lib/memory/semantic-memory-pg.js` | Layer 1 semantic | KEEP |
| `lib/memory/decision-memory-pg.js` | Decision memory | KEEP |
| `lib/constitutional-types/historical-state-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `episodic_memory` | KEEP | Layer 0 episodic (RT-07) |
| `semantic_memory` | KEEP | Layer 1 semantic |
| `procedural_memory` | KEEP | Layer 2 procedural |
| `strategic_memory` | KEEP | Layer 3 strategic |
| `skill_memory` | KEEP | Layer 4 skill |
| `decision_memory` | KEEP | Layer 5 decision |
| `knowledge_graph` | KEEP | Layer 8 knowledge |
| `reflexion_events` | KEEP | Reflection events |
| `improvement_events` | KEEP | Improvement tracking |
| `historical_state_records` (migration 089) | NEW | Formal HistoricalStateRecord |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| HistoricalStateRecord | [WRAP] memory table rows | Wave 1 |
| ProvenanceChain | [NEW] | Wave 1 |
| MemoryLifecycleRecord | [NEW] | Wave 1 |
| HistoricalStateQueryResult | [NEW] (interface for RT-03) | Wave 2 (critical) |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/memory/*` | `routes/memory.js`, `routes/intelligence-memory.js` | `routes/memory.js` (kept, merged) | KEEP |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `memory.context.delivered` | getContext() returns | RT-03 (PETL Step 2) | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| Post-commit hook (RT-03) | RT-03 FINALIZED | Episodic memory write from operation context |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 28 | RT-07→RT-08 | HistoricalStateQueryResult for observation contextualization |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 08 | RT-03 | Step 2: RT-03 queries RT-07 for HistoricalStateQueryResult |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-07-001 | CRITICAL | HistoricalStateQueryResult formal type and getHistoricalState() method missing |
| GAP-03-001 | CRITICAL | RT-03 cannot query RT-07 (same gap, RT-07 side) |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/historical-state-record.js` with HistoricalStateRecord, ProvenanceChain, MemoryLifecycleRecord, HistoricalStateQueryResult schemas
2. **Wave 2, W2-01:** Add `getHistoricalState(timestamp)` to `lib/memory/gateway.js` returning `HistoricalStateQueryResult`
3. **Wave 2:** Create migration 089 adding `historical_state_records` formal schema

### Completion Criteria
- [ ] `getHistoricalState(timestamp)` method exists on `lib/memory/gateway.js`
- [ ] Returns formal `HistoricalStateQueryResult` with `query_id`, `historical_layers`, `temporal_validity_ms`, `status`
- [ ] RT-03 PETL Step 2 calls this method (verified by integration test)
- [ ] Migration 089 applied
- [ ] Historical state records are append-only (INV-04)

---

## RT-08 — OBSERVATION RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-08 |
| Canonical Name | Observation Runtime |
| Constitutional Authority | A0-v1.1.1 §3.8; D5 PI-1–PI-12 |
| Tier | Tier 3 — Epistemic Chain |
| A1 Loop Phase | Phase 1 (Observation), Phase 9 (Observation of Consequence) |

### Current Implementation Status: PARTIAL

`lib/observer-health/` implements observer sensors and health scoring. `lib/attention/` implements attention scoring and tier assignment. Neither produces a formal `ObservationRecord`. The Observation Boundary (Zone 6 enforcement) is not implemented.

### Missing Implementation
1. `lib/observation/boundary.js` — Observation Boundary gate (Zone 6)
2. `lib/observation/record.js` — ObservationRecord factory
3. Formal `ObservationRecord`, `ObserverRegister`, `ObservationChannelRecord`, `ConsequenceObservationRecord`, `ObserverLimitationRecord` types
4. Migration 082
5. Consequence monitor interface (`openConsequenceMonitor()`)

### Repository Location
| | Location |
|-|----------|
| Current | `lib/observer-health/`, `lib/attention/` |
| Target | `lib/observation/` (new) + existing refactored |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/observer-health/index.js` | Observer sensors | REFACTOR — emit ObservationRecord |
| `lib/attention/` | Attention scoring | KEEP — feeds ObservationRecord |
| `lib/observation/boundary.js` | Observation Boundary (Zone 6) | CREATE |
| `lib/observation/record.js` | ObservationRecord factory | CREATE |
| `lib/constitutional-types/observation-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `observer_registry` | KEEP | Observer registration (migration 067) |
| `calibration_events` | KEEP | Observer calibration history |
| `sensor_health_scores` | KEEP | Observer health (migration 067) |
| `observation_records` | NEW (migration 082) | Formal ObservationRecord store |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| ObservationRecord | [NEW] | Wave 1 |
| ObserverRegister | [WRAP] observer_registry | Wave 1 |
| ObservationChannelRecord | [NEW] | Wave 1 |
| ConsequenceObservationRecord | [NEW] | Wave 1 |
| ObserverLimitationRecord | [NEW] | Wave 1 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.loop.observation` | ObservationRecord submitted | RT-09 | A (via PETL) |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.loop.action` | RT-13 | Opens consequence monitor |
| `constitutional.loop.consequence` | RT-14 | Re-observation of consequence |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 28 | RT-07 | HistoricalStateQueryResult for observation contextualization |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 04 (RT-08→RT-03) | RT-03 | ObservationRecord submitted as Class A operation |
| PAIR 29 | RT-09 | ObservationRecord → EvidenceObject pipeline |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-08-001 (implied) | HIGH | No Observation Boundary implementation |
| GAP-08-002 (implied) | HIGH | No ObservationRecord produced by observer sensors |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/observation-record.js`
2. **Wave 3, W3-02:** Create `lib/observation/boundary.js` implementing Zone 6 enforcement
3. **Wave 3, W3-02:** Create `lib/observation/record.js` as ObservationRecord factory
4. **Wave 3, W3-02:** Refactor `lib/observer-health/index.js` to produce ObservationRecord
5. **Wave 3, W3-02:** Add `openConsequenceMonitor()` to `lib/observer-health/index.js`
6. **Wave 3:** Create migration 082

### Completion Criteria
- [ ] `lib/observation/boundary.js` enforces that no external data enters RT-09 without passing through ObservationRecord production
- [ ] `lib/observer-health/index.js` produces formal `ObservationRecord` for every observation event
- [ ] `openConsequenceMonitor()` exists and registers consequence monitoring for a given `ProjectionRecord`
- [ ] Migration 082 applied
- [ ] II-06 verified: observation boundary enforced before fabric entry

---

## RT-09 — EVIDENCE/KNOWLEDGE RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-09 |
| Canonical Name | Evidence and Knowledge Runtime |
| Constitutional Authority | A0-v1.1.1 §3.9 |
| Tier | Tier 3 — Epistemic Chain |
| A1 Loop Phase | Phase 2 (Evidence), Phase 3 (Knowledge) |

### Current Implementation Status: PARTIAL

`lib/beliefs/` implements belief objects. `lib/intelligence/knowledge-validator.js` implements knowledge validation. `lib/memory/knowledge-graph.js` (Layer 8) stores knowledge. However, no formal `EvidenceObject`, `KnowledgeRecord`, or `KnowledgeState` constitutional types exist. The DKS-1–4 epistemic states across 12 domains are not tracked.

### Missing Implementation
1. Formal `EvidenceObject`, `InterpretationRecord`, `BeliefObject`, `KnowledgeClaim`, `KnowledgeState`, `ContradictionRecord`, `RealityGapEntry`, `EpistemicProtocol` types
2. `lib/knowledge/record.js` — KnowledgeRecord management
3. `lib/knowledge/evidence-pipeline.js` — ObservationRecord → KnowledgeRecord pipeline
4. `KnowledgeState` tracking for 12 domains × DKS-1–4 states
5. Migration 083

### Repository Location
| | Location |
|-|----------|
| Current | `lib/beliefs/`, `lib/intelligence/knowledge-validator.js`, `lib/memory/knowledge-graph.js` |
| Target | `lib/knowledge/` (new) + existing refactored |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/beliefs/` | Belief objects | REFACTOR — align with BeliefObject type |
| `lib/intelligence/knowledge-validator.js` | Knowledge validation | WRAP — emit KnowledgeRecord |
| `lib/knowledge/record.js` | KnowledgeRecord management | CREATE |
| `lib/knowledge/evidence-pipeline.js` | Evidence pipeline | CREATE |
| `lib/constitutional-types/knowledge-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `understanding_scores` | KEEP (migration 068) | Understanding quality scores |
| `understanding_gaps` | KEEP (migration 068) | Knowledge gaps register |
| `knowledge_records` | NEW (migration 083) | Formal KnowledgeRecord store |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| EvidenceObject | [WRAP] belief objects | Wave 1 |
| InterpretationRecord | [NEW] | Wave 1 |
| BeliefObject | [WRAP] lib/beliefs/ | Wave 1 |
| KnowledgeClaim | [NEW] | Wave 1 |
| KnowledgeState (DKS-1–4 × 12 domains) | [NEW] | Wave 2 |
| ContradictionRecord | [NEW] | Wave 1 |
| RealityGapEntry | [NEW] | Wave 1 |
| EpistemicProtocol | [NEW] | Wave 1 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.loop.knowledge` | KnowledgeRecord formed | RT-10 | A (via PETL) |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.loop.observation` | RT-08 | ObservationRecord → EvidenceObject conversion |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 29 | RT-08 | ObservationRecord delivered for EvidenceObject production |
| PAIR 07 | RT-07 | Historical knowledge state for context |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 31 | RT-10 | KnowledgeRecord → DomainUnderstandingModel |
| PAIR 09 | RT-03 | Gate 4 epistemic validation using KnowledgeRecord |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-09-001 (implied) | HIGH | No formal KnowledgeRecord type |
| GAP-09-002 (implied) | HIGH | ObservationRecord→KnowledgeRecord pipeline not wired |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/knowledge-record.js`
2. **Wave 2:** Create `lib/knowledge/record.js` and `lib/knowledge/evidence-pipeline.js`
3. **Wave 2:** Refactor `lib/beliefs/` to produce `BeliefObject` aligned with constitutional schema
4. **Wave 2:** Wire evidence pipeline: RT-08 ObservationRecord → RT-09 KnowledgeRecord
5. **Wave 2:** Create migration 083

### Completion Criteria
- [ ] `EvidenceObject` and `KnowledgeRecord` are formal constitutional types
- [ ] `KnowledgeRecord.lineage` field traces to `ObservationRecord.record_id` (INV-4)
- [ ] `KnowledgeState` tracked for each of 12 domains
- [ ] Gate 4 uses formal `KnowledgeRecord` for epistemic validation
- [ ] Migration 083 applied

---

## RT-10 — UNDERSTANDING RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-10 |
| Canonical Name | Understanding Runtime |
| Constitutional Authority | A0-v1.1.1 §3.10 |
| Tier | Tier 3 — Epistemic Chain |
| A1 Loop Phase | Phase 4 (Understanding) |

### Current Implementation Status: PARTIAL

`lib/understanding/` and `lib/intelligence/sie.js` (Synthetic Intelligence Engine) implement understanding synthesis. The SIE produces outputs that serve as the CUM analog. However, the `DomainUnderstandingModel` formal type does not exist, and the CUM is not a typed constitutional object.

**OVL-009 conflict:** `lib/cognitive/` partially overlaps with RT-11 SIE functionality. Resolution required before RT-10 wiring is complete.

### Missing Implementation
1. Formal `DomainUnderstandingModel` type (×12)
2. Formal `CivilizationUnderstandingModel` (CUM) type wrapping SIE output
3. `InferenceProtocol` type
4. `UnderstandingDegradationFlag` type
5. OVL-009 resolution (lib/cognitive/ overlap)

### Repository Location
| | Location |
|-|----------|
| Current | `lib/understanding/`, `lib/intelligence/sie.js` |
| Target | Same + `lib/constitutional-types/cum.js` |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/intelligence/sie.js` | SIE — CUM source | WRAP — output as CUM type |
| `lib/understanding/` | Understanding models | REFACTOR — emit DomainUnderstandingModel |
| `lib/cognitive/` | Legacy — OVL-009 conflict | MERGE into civilisation/ (Wave 4) |
| `lib/constitutional-types/cum.js` | CUM + DomainUnderstandingModel types | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| Intelligence tables (migrations 019-024) | KEEP | SIE state persistence |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| DomainUnderstandingModel (×12) | [WRAP] SIE domain outputs | Wave 2 |
| InferenceProtocol | [NEW] | Wave 1 |
| UnderstandingDegradationFlag | [NEW] | Wave 1 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.loop.understanding` | CUM synthesized | RT-11 (deliberation) | A |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.loop.knowledge` | RT-09 | KnowledgeRecord → DomainUnderstandingModel update |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 31 | RT-09 | KnowledgeRecord delivered for DomainUnderstandingModel update |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 32 | RT-11 | CUM delivered; RT-11 can request re-synthesis (BLOCK) |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| OVL-009 | CRITICAL | lib/cognitive/ overlaps with civilisation/SIE; must resolve before RT-10/RT-11 wiring |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/cum.js` with CUM, DomainUnderstandingModel, InferenceProtocol types
2. **Wave 2:** Wrap `lib/intelligence/sie.js` output with formal CUM type
3. **Wave 2:** Wire PAIR 32: CUM delivery to RT-11 via `constitutional.loop.understanding` event
4. **Wave 4:** Resolve OVL-009 — merge `lib/cognitive/` into `civilisation/`

### Completion Criteria
- [ ] SIE output wrapped as formal `CivilizationUnderstandingModel`
- [ ] `DomainUnderstandingModel` produced for each of 12 domains
- [ ] II-12 enforced: CUM invalidation notifies RT-11 (PAIR 32)
- [ ] OVL-009 resolved (Wave 4)

---

## RT-11 — CIVILIZATION UNDERSTANDING RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-11 |
| Canonical Name | Civilization Understanding Runtime |
| Constitutional Authority | A0-v1.1.1 §3.11 |
| Tier | Tier 3/4 — Epistemic/Decision boundary |
| A1 Loop Phase | Phase 5 (Deliberation), Phase 6 (Decision) |

### Current Implementation Status: PARTIAL

`civilisation/consensus.js` implements the constitutional quorum (5-of-9) and session types. `civilisation/deliberation.js` implements deliberation. The SIE conflict with `lib/cognitive/` (OVL-009) must be resolved. No formal `CivilizationalDecisionProposal` or `CivilizationCoherenceState` types exist.

**Critical constraint:** RT-11 is the ONLY runtime that may initiate RT-16 (PAIR 59). Amendment proposals must emerge from deliberation.

### Missing Implementation
1. Formal `CivilizationalDecisionProposal` type
2. Formal `CivilizationCoherenceState` type
3. RT-16 initiation pathway from RT-11 (PAIR 59)
4. `DeliberationRecord` formal type
5. OVL-009 resolution

### Repository Location
| | Location |
|-|----------|
| Current | `civilisation/consensus.js`, `civilisation/deliberation.js` |
| Target | Same (primary) + `lib/cognitive/` merged in (Wave 4) |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `civilisation/consensus.js` | Quorum + decision sessions | REFACTOR — produce CivilizationalDecisionProposal |
| `civilisation/deliberation.js` | Deliberation logic | REFACTOR — produce DeliberationRecord |
| `lib/cognitive/` | OVL-009 — legacy overlap | MERGE then DELETE (Wave 4) |
| `lib/constitutional-types/civilizational-decision-proposal.js` | Type definition | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `consensus_sessions` | KEEP (migration 063) | Deliberation and decision sessions |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| CivilizationUnderstandingModel (CUM) | [WRAP] SIE output (owned by RT-10/RT-11 boundary) | Wave 2 |
| DeliberationRecord | [NEW] | Wave 1 |
| CausalModel | [NEW] | Wave 1 |
| AssumptionRegister | [NEW] | Wave 1 |
| StrategicPlan | [NEW] | Wave 1 |
| CivilizationCoherenceState | [NEW] | Wave 1 |
| CivilizationalDecisionProposal | [NEW] | Wave 2 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.loop.decision` | CivilizationalDecision sealed | RT-12 (compliance), RT-03 | A |
| `constitutional.amendment.proposed` | RT-11 initiates RT-16 | RT-04 (audit), RT-16 | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.loop.understanding` | RT-10 | CUM delivered for deliberation |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 32 | RT-10 | CUM delivery; RT-11 can request re-synthesis (BLOCK) |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 40 | RT-12 | Decision submitted for compliance verification (BLOCK) |
| PAIR 59 | RT-16 | Amendment proposal from deliberation (RT-11 is ONLY initiator) |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| OVL-009 | CRITICAL | lib/cognitive/ SIE overlap; constitutional confusion |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/civilizational-decision-proposal.js`
2. **Wave 2:** Refactor `consensus.js` to produce formal `CivilizationalDecisionProposal`
3. **Wave 3, W3-05:** Wire RT-16 initiation path from RT-11 deliberation
4. **Wave 4:** Resolve OVL-009

### Completion Criteria
- [ ] `consensus.js` produces formal `CivilizationalDecisionProposal`
- [ ] RT-11 initiation path to RT-16 (`lib/amendment/pipeline.js.receive()`) wired
- [ ] `DeliberationRecord` produced for every deliberation session
- [ ] OVL-009 resolved (Wave 4)

---

## RT-12 — DECISION RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-12 |
| Canonical Name | Decision Runtime (C0-MANIFEST §5.2 canonical name) |
| Constitutional Authority | A0-v1.1.1 §3.12; RT12-v1.0 |
| Tier | Tier 4 — Decision/Compliance Layer |
| A1 Loop Phase | Phase 6 (Decision — compliance verification gate) |

### Current Implementation Status: PARTIAL

`lib/runtime/decision-lattice.js` implements decision compliance checking. `lib/intent/` manages intent objects. However, no formal `ComplianceVerificationRecord`, `CivilizationalDecision`, or `OpenActionRegisterEntry` types exist.

**Canonical name note (C0-MANIFEST §5.2 item 4):** RT-12 canonical name is "Decision Runtime." A1-v1.2 calls it "Constitutional Compliance Runtime." C0-MANIFEST freezes the canonical name as Decision Runtime.

### Missing Implementation
1. `lib/decision/compliance-gate.js` — ComplianceVerificationRecord production
2. `lib/decision/objects.js` — OpenActionRegisterEntry, CivilizationalDecision management
3. Formal `CivilizationalDecision`, `ComplianceVerificationRecord`, `OpenActionRegisterEntry`, `DecisionArchiveRecord`, `CivilizationalDecisionChainRecord` types
4. Migration 084

### Repository Location
| | Location |
|-|----------|
| Current | `lib/runtime/decision-lattice.js`, `lib/intent/` |
| Target | `lib/decision/` (new) + existing refactored |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/runtime/decision-lattice.js` | Decision compliance (RT-12 core) | WRAP — emit ComplianceVerificationRecord |
| `lib/intent/` | Intent management | REFACTOR — align with OpenActionRegisterEntry |
| `lib/decision/compliance-gate.js` | Compliance gate | CREATE |
| `lib/decision/objects.js` | Decision objects | CREATE |
| `lib/constitutional-types/civilizational-decision.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `compliance_verification_records` | NEW (migration 084) | Formal compliance verification log |
| `open_action_register` | NEW (migration 084) | OpenActionRegisterEntry table |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| CivilizationalDecision | [NEW] | Wave 1 |
| OpenActionRegisterEntry | [WRAP] lib/intent/ entries | Wave 1 |
| DecisionArchiveRecord | [NEW] | Wave 1 |
| CivilizationalDecisionChainRecord | [NEW] | Wave 1 |
| ComplianceVerificationRecord | [NEW] | Wave 2 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `compliance.verified` | ComplianceVerificationRecord produced | RT-11 (seal decision), RT-03 (Gate 5) | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.loop.decision` (proposal) | RT-11 | CivilizationalDecisionProposal received for compliance check |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 40 | RT-11 | Decision Proposal submitted for compliance (BLOCK) |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 10 | RT-03 | Gate 5 uses ComplianceVerificationRecord |
| PAIR 41 | RT-13 | Sealed CivilizationalDecision enables action projection |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-12-001 (implied) | HIGH | No ComplianceVerificationRecord type or production |
| GAP-12-002 (implied) | HIGH | OpenActionRegister not formally typed |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/civilizational-decision.js`
2. **Wave 2:** Create `lib/decision/compliance-gate.js` wrapping `decision-lattice.js`
3. **Wave 2:** Create `lib/decision/objects.js` for OpenActionRegisterEntry management
4. **Wave 2:** Create migration 084

### Completion Criteria
- [ ] `decision-lattice.js` output wrapped as `ComplianceVerificationRecord`
- [ ] Gate 5 in `constitutional-gate.js` validates a formal `ComplianceVerificationRecord`
- [ ] `OpenActionRegisterEntry` produced for every sealed `CivilizationalDecision`
- [ ] Migration 084 applied

---

## RT-13 — ACTION PROJECTION RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-13 |
| Canonical Name | Action Projection Runtime |
| Constitutional Authority | A0-v1.1.1 §3.13; D5 PI-1–PI-12 |
| Tier | Tier 5 — Action/Reflection Layer |
| A1 Loop Phase | Phase 7 (Action) |

### Current Implementation Status: PARTIAL

PETL EXECUTING state implements action projection lifecycle. `lib/runtime/outcome-registry.js` tracks outcomes. However, no `EffectExpectationRecord`, `IrreversibilityClassificationRecord`, or `ProjectionBoundaryCrossingRecord` types exist. D5 PI-1 through PI-12 are not explicitly implemented.

**Key constraint (INV-7):** `EffectExpectationRecord` must be produced at COMMITTED state (before EXECUTING) — i.e., before the action crosses the Projection Boundary.

### Missing Implementation
1. `lib/action/effect-expectation.js` — EffectExpectationRecord production at COMMITTED
2. `lib/action/projection-record.js` — ProjectionRecord post-action
3. `IrreversibilityClassificationRecord` (D5 PI-8 Projection Reversibility)
4. `ProjectionBoundaryCrossingRecord` (D5 PI-6 Boundary Integrity)
5. D5 PI-1–PI-12 explicitly implemented
6. Migration 085

### Repository Location
| | Location |
|-|----------|
| Current | `lib/runtime/execution-transaction.js` (EXECUTING state), `lib/runtime/outcome-registry.js` |
| Target | `lib/action/` (new) + existing refactored |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/runtime/execution-transaction.js` | PETL EXECUTING state | REFACTOR — emit EffectExpectationRecord at COMMITTED |
| `lib/runtime/outcome-registry.js` | Outcome tracking | WRAP — emit ProjectionRecord |
| `lib/action/effect-expectation.js` | EffectExpectationRecord factory | CREATE |
| `lib/action/projection-record.js` | ProjectionRecord factory | CREATE |
| `lib/constitutional-types/effect-expectation-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `execution_transactions` | KEEP/EXTEND | PETL transaction log (RT-03 primary) |
| `effect_expectations` | NEW (migration 085) | EffectExpectationRecord store |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| ActionProjection | [WRAP] PETL execution context | Wave 1 |
| EffectExpectationRecord | [NEW] | Wave 2 (critical — INV-7) |
| IrreversibilityClassificationRecord | [NEW] | Wave 2 |
| ProjectionResponsibilityRecord | [NEW] | Wave 1 |
| ProjectionBoundaryCrossingRecord | [NEW] | Wave 2 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.loop.action` | PETL FINALIZED | RT-08 (consequence monitor open), RT-14 | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `compliance.verified` | RT-12 | Sealed Decision enables action (PAIR 41) |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 41 | RT-12 | CivilizationalDecision required before action projection |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 42 | RT-08 | Consequence monitor opened after action emission |
| PAIR 43 | RT-14 | EffectExpectationRecord reference for consequence tracking |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-13-001 (implied) | HIGH | No EffectExpectationRecord produced at COMMITTED state |
| GAP-13-002 (implied) | HIGH | No consequence monitor notification to RT-08 after action |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/effect-expectation-record.js`
2. **Wave 2:** Create `lib/action/effect-expectation.js`; modify `execution-transaction.js` to call it at COMMITTED→EXECUTING transition
3. **Wave 2:** Wrap `outcome-registry.js` with `ProjectionRecord` type
4. **Wave 2:** Create migration 085
5. **Wave 3, W3-05:** Wire RT-13→RT-08 notification after FINALIZED

### Completion Criteria
- [ ] `EffectExpectationRecord` produced at COMMITTED state, before EXECUTING (INV-7)
- [ ] `ProjectionBoundaryCrossingRecord` produced when action crosses Projection Boundary
- [ ] RT-08 `openConsequenceMonitor()` called after every FINALIZED action
- [ ] Migration 085 applied

---

## RT-14 — CONSEQUENCE OBSERVATION RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-14 |
| Canonical Name | Consequence Observation Runtime |
| Constitutional Authority | A0-v1.1.1 §3.14 |
| Tier | Tier 5 — Action/Reflection Layer |
| A1 Loop Phase | Phase 9 (Observation of Consequence), Phase 10 (Updated Understanding) |

### Current Implementation Status: PARTIAL/STUB

The post-response hook in `middleware/civilization-kernel.js` partially implements RT-14 (episodic memory write after action). `lib/runtime/outcome-registry.js` tracks outcomes. However, no formal `ObservedConsequenceRecord`, `CausalModelDivergenceRecord`, or `ReflectionTriggerRecord` types exist.

**INV-6 constraint:** Every `EffectExpectationRecord` must eventually have a corresponding `ObservedConsequenceRecord`.

### Missing Implementation
1. `lib/reflection/consequence-record.js` — ConsequenceObservationRecord factory
2. Formal `ObservedConsequenceRecord`, `CausalModelDivergenceRecord`, `OpenActionRegisterTerminalStatusRecord`, `ReflectionTriggerRecord` types
3. `CausalModelDivergenceRecord` production when consequence diverges from expectation
4. Loop-back mechanism: consequence → RT-08 re-observation (PAIR 60)
5. Migration 086

### Repository Location
| | Location |
|-|----------|
| Current | Post-hook in `middleware/civilization-kernel.js`, `lib/runtime/outcome-registry.js` |
| Target | `lib/reflection/` (new) + existing refactored |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `middleware/civilization-kernel.js` (post-hook) | Post-action observation | REFACTOR — emit ConsequenceObservationRecord |
| `lib/runtime/outcome-registry.js` | Outcome registry | WRAP — emit ObservedConsequenceRecord |
| `lib/reflection/consequence-record.js` | ConsequenceObservationRecord factory | CREATE |
| `lib/constitutional-types/consequence-observation-record.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `consequence_observations` | NEW (migration 086) | ObservedConsequenceRecord store |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| ObservedConsequenceRecord | [NEW] | Wave 1 |
| CausalModelDivergenceRecord | [NEW] | Wave 1 |
| OpenActionRegisterTerminalStatusRecord | [NEW] | Wave 1 |
| ReflectionTriggerRecord | [NEW] | Wave 2 |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.loop.consequence` | ConsequenceObservationRecord produced | RT-08 (re-observation), RT-09→RT-11 (understanding update) | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.loop.action` | RT-13 | Opens consequence tracking for EffectExpectationRecord |

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 43 | RT-13 | EffectExpectationRecord reference for consequence tracking |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 60 | RT-08 | Consequence loops back as new observation |
| — | RT-09→RT-10→RT-11 | Understanding update cycle |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-14-001 (implied) | HIGH | No formal ConsequenceObservationRecord |
| INV-6 | HIGH | No mechanism ensures every EffectExpectationRecord has a ConsequenceObservationRecord |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/consequence-observation-record.js`
2. **Wave 2:** Create `lib/reflection/consequence-record.js`
3. **Wave 2:** Refactor `outcome-registry.js` to produce formal `ObservedConsequenceRecord`
4. **Wave 2:** Refactor post-hook in `civilization-kernel.js` to emit `constitutional.loop.consequence`
5. **Wave 2:** Create migration 086

### Completion Criteria
- [ ] `ObservedConsequenceRecord` produced after every FINALIZED action
- [ ] `CausalModelDivergenceRecord` produced when consequence diverges from `EffectExpectationRecord`
- [ ] Loop-back to RT-08 working: `constitutional.loop.consequence` triggers RT-08 re-observation
- [ ] INV-6 enforced: outstanding EffectExpectationRecords tracked; alerts on missing consequence
- [ ] Migration 086 applied

---

## RT-15 — DOMAIN RUNTIMES (×12)

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-15 |
| Canonical Name | Domain Runtime (×12 instances) |
| Constitutional Authority | A0-v1.1.1 §3.15; RT15-v1.0 |
| Tier | Tier 6 — Domain Layer |
| A1 Loop Phase | Phases 3, 4 (domain context contributions); Phase 10 (domain updates) |

### Current Implementation Status: PARTIAL (2 of 12 instances missing)

`domains/` contains DOM-000001 through DOM-000010 (10 instances). Each domain has a structured module with `src/runtime/index.js`, `src/config/`, and `src/data/`. `civilisation/domain-loader.js` loads domain modules at startup.

**GAP-15-001:** DOM-000011 and DOM-000012 do not exist.

### Missing Implementation
1. DOM-000011 domain module (identity of domain 11 TBD per constitutional specification)
2. DOM-000012 domain module (identity of domain 12 TBD per constitutional specification)
3. Formal `DomainProfile`, `DomainAuthorityRecord`, `DomainActorProfileRegistry`, `DomainKnowledgeChain`, `DomainCoherenceAssessment`, `DomainFailureModeRecord`, `CrossDomainRelationshipRecord` types (×12 per instance)
4. Registration of DOM-000011 and DOM-000012 in `civilisation/domain-loader.js`

### Repository Location
| | Location |
|-|----------|
| Current | `domains/` (10 modules) |
| Target | `domains/` (12 modules) + `lib/constitutional-types/domain-profile.js` |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `domains/[001-010]/src/runtime/index.js` | Domain runtime instances | KEEP |
| `civilisation/domain-loader.js` | Domain bootstrapper | EXTEND — add DOM-000011, DOM-000012 |
| `domains/dom-000011/` | Domain 11 | CREATE (Wave 3) |
| `domains/dom-000012/` | Domain 12 | CREATE (Wave 3) |
| `lib/constitutional-types/domain-profile.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `domain_health` | KEEP (migration 039) | Per-domain health scores |
| `domain_agents` | KEEP (migration 039) | Domain actor registry |

### Constitutional Object Type Ownership (per instance)
| Type | Status | Wave |
|------|--------|------|
| DomainProfile | [NEW] | Wave 1 |
| DomainAuthorityRecord | [NEW] | Wave 1 |
| DomainActorProfileRegistry | [WRAP] domain_agents | Wave 1 |
| DomainKnowledgeChain | [NEW] | Wave 1 |
| DomainCoherenceAssessment | [WRAP] domain_health | Wave 1 |
| DomainFailureModeRecord | [NEW] | Wave 1 |
| CrossDomainRelationshipRecord | [NEW] | Wave 1 |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/domains/*` | `routes/civilization.js` (partial) | `routes/domains.js` (new) | NEW |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `domain.coherence.status` | Post-GCR evaluation | RT-06 (collector), RT-04 | B |

### Events Consumed
| Event | Source | Use |
|-------|--------|-----|
| `constitutional.coherence.violation` | RT-06 | DomainCoherenceStatus update |
| `constitutional.loop.consequence` (DomainUpdateTrigger) | RT-14 | Domain understanding update |
| `constitutional.amendment.ratified` | RT-16 | All domain instances notified |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-15-001 | CRITICAL | DOM-000011 and DOM-000012 do not exist |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/domain-profile.js`
2. **Wave 3, W3-04:** Create `domains/dom-000011/` following existing domain module structure
3. **Wave 3, W3-04:** Create `domains/dom-000012/` following existing domain module structure
4. **Wave 3, W3-04:** Register both in `civilisation/domain-loader.js`
5. **Wave 3, W3-04:** Verify `domains.length === 12` at startup (II-11)

### Completion Criteria
- [ ] `civilisation/domain-loader.js` loads exactly 12 domain instances
- [ ] DOM-000001 initializes first (II-11)
- [ ] DOM-000011 and DOM-000012 pass the same structural validation as DOM-000001–010
- [ ] `DomainProfile` formal type exists for each instance
- [ ] GAP-15-001 resolved

---

## RT-16 — AMENDMENT RUNTIME

### Identification
| Field | Value |
|-------|-------|
| Runtime ID | RT-16 |
| Canonical Name | Amendment Runtime |
| Constitutional Authority | A0-v1.1.1 §3.16; R16-v1.0; A1-v1.2 §12.8 |
| Tier | Tier 7 — Constitutional Maintenance Layer |
| A1 Loop Phase | ABSENT from all 10 standard loop phases (C0-MANIFEST §5.2 item 5) |

### Current Implementation Status: STUB

`lib/constitution/amendments.json` stores amendment history as a JSON file. No 15-step amendment pipeline. No amendment state machine. No `AmendmentProposal`, `AmendmentRegistry`, `RatifiedAmendmentRecord`, or `AmendmentRejectionRecord` types.

**Critical constitutional constraint (A1-v1.2 §12.8, §14.3):**
- RT-16 CANNOT self-initiate. Only RT-11 may propose amendments (PAIR 59)
- RT-16 is NOT part of the Constitutional Loop
- Class I amendments require human actor authorization (D7 §12.2)
- RT-04 must complete a PreservationAuditRecord before Class I amendment proceeds (PAIR 60, BLOCK)
- Amendment commit passes through all 6 RT-03 gates (PAIR 61)

### Missing Implementation
1. `lib/amendment/pipeline.js` — 15-step amendment state machine (§12.8)
2. `lib/amendment/classifier.js` — Class I/II/III/IV classification
3. `lib/amendment/preservation-audit.js` — PreservationAuditRecord production for Class I
4. Formal `AmendmentProposal`, `AmendmentRegistry`, `RatifiedAmendmentRecord`, `AmendmentRejectionRecord` types
5. PAIR 59 wiring (RT-11 → RT-16 initiation path)
6. PAIR 60 wiring (RT-04 PreservationAuditRecord gate for Class I)
7. PAIR 61 wiring (RT-16 commit passes all 6 RT-03 gates)
8. Migration 087 (amendments table)
9. `routes/amendments.js` API

### Repository Location
| | Location |
|-|----------|
| Current | `lib/constitution/amendments.json` (stub) |
| Target | `lib/amendment/` (new); `lib/constitution/amendments.json` → `amendments` table (migration 087) |

### Files Responsible
| File | Role | Action |
|------|------|--------|
| `lib/constitution/amendments.json` | Amendment history (stub) | MIGRATE to DB then KEEP as archive |
| `lib/amendment/pipeline.js` | 15-step state machine | CREATE (Wave 3 — largest task) |
| `lib/amendment/classifier.js` | Class I–IV classifier | CREATE |
| `lib/amendment/preservation-audit.js` | PreservationAuditRecord gate | CREATE |
| `routes/amendments.js` | RT-16 API | CREATE |
| `lib/constitutional-types/amendment-proposal.js` | Type definitions | CREATE |

### Database Ownership
| Table | Status | Purpose |
|-------|--------|---------|
| `lib/constitution/amendments.json` | KEEP (archive) | Historical amendment record |
| `amendments` table | NEW (migration 087) | Formal AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord, AmendmentRejectionRecord |

### Constitutional Object Type Ownership
| Type | Status | Wave |
|------|--------|------|
| AmendmentProposal | [NEW] | Wave 3 |
| AmendmentRegistry | [NEW] | Wave 3 |
| RatifiedAmendmentRecord | [NEW] | Wave 3 |
| AmendmentRejectionRecord | [NEW] | Wave 3 |

### API Ownership
| Namespace | Current Route | Target Route | Status |
|-----------|--------------|--------------|--------|
| `/api/amendments/*` | None | `routes/amendments.js` (new) | NEW |

### Events Produced
| Event | Trigger | Consumer | Class |
|-------|---------|----------|-------|
| `constitutional.amendment.proposed` | AmendmentProposal received | RT-04 (audit) | B |
| `constitutional.amendment.ratified` | RatifiedAmendmentRecord produced | ALL runtimes | B |
| `constitutional.amendment.rejected` | AmendmentRejectionRecord produced | RT-04, RT-11 | B |

### Events Consumed
RT-16 does not consume events from the Constitutional Loop. It receives amendment proposals exclusively from RT-11 via the `lib/amendment/pipeline.js.receive()` interface (PAIR 59).

### PAIR Dependencies
| PAIR | Source | Interaction |
|------|--------|-------------|
| PAIR 59 | RT-11 | Amendment Proposal — RT-11 is the ONLY initiator |
| PAIR 60 | RT-04 | PreservationAuditRecord BLOCK for Class I amendments |

### PAIR Dependents
| PAIR | Target | Interaction |
|------|--------|-------------|
| PAIR 61 | RT-03 | Amendment commit passes through all 6 gates |
| — | ALL RT | Ratification notification on success |

### Gap Register Entries
| Gap ID | Severity | Description |
|--------|----------|-------------|
| GAP-16-001 | CRITICAL | Full 15-step amendment pipeline not implemented |
| GAP-16-002 | CRITICAL | 4 constitutional object types missing |
| GAP-16-003 (implied) | HIGH | PAIR 59/60/61 wiring not implemented |
| GAP-16-004 (implied) | HIGH | Class I human authorization gate not implemented |

### Migration Steps
1. **Wave 1:** Create `lib/constitutional-types/amendment-proposal.js` (type definitions only)
2. **Wave 3, W3-01 (XL):** Create `lib/amendment/pipeline.js` — full 15-step state machine per A1-v1.2 §12.8
3. **Wave 3, W3-01:** Create `lib/amendment/classifier.js`
4. **Wave 3, W3-01:** Create `lib/amendment/preservation-audit.js`
5. **Wave 3, W3-01:** Create migration 087 (amendments table)
6. **Wave 3, W3-01:** Create `routes/amendments.js`
7. **Wave 3, W3-05:** Wire PAIR 59 from `civilisation/consensus.js` to `lib/amendment/pipeline.js.receive()`
8. **Wave 3, W3-05:** Wire PAIR 61: amendment commit path through PETL all 6 gates

### Completion Criteria
- [ ] `lib/amendment/pipeline.js` implements all 15 steps from A1-v1.2 §12.8
- [ ] RT-16 cannot self-initiate: `pipeline.js.receive()` verifies caller is RT-11 deliberation
- [ ] Class I amendments block at Step 4 for human actor authorization
- [ ] `PreservationAuditRecord` produced and verified before Class I amendment proceeds
- [ ] Amendment commit routes through `execution-transaction.begin()` with all 6 gates
- [ ] `constitutional.amendment.ratified` broadcast to all runtime instances on ratification
- [ ] Migration 087 applied; `amendments.json` content migrated
- [ ] GAP-16-001 and GAP-16-002 resolved
- [ ] II-08 verified: no RT-16 code appears in `civilization-kernel.js` loop handlers

---

## RUNTIME SUMMARY TABLE

| RT | Name | Current Status | Critical Gaps | Target Module | Wave |
|----|------|---------------|--------------|---------------|------|
| RT-01 | Identity | PARTIAL | No formal IdentityRecord | lib/identity/ (new) | Wave 1–2 |
| RT-02 | Authority | PARTIAL | No formal authority types | lib/constitution/ (extend) | Wave 1–2 |
| RT-03 | Kernel | PARTIAL | GAP-03-001, -002, -003 | lib/runtime/ (extend) | Wave 2 |
| RT-04 | Audit | PARTIAL | No PreservationAuditRecord | lib/audit/ (extend) | Wave 1, 3 |
| RT-05 | Reality Fabric | PARTIAL | GAP-05-001 (ChangeRecord) | lib/reality/ (extend) | Wave 2 |
| RT-06 | Coherence | MISSING | Entire module missing | lib/coherence/ (new) | Wave 2 |
| RT-07 | Memory | PARTIAL | GAP-07-001 (HSQR) | lib/memory/ (extend) | Wave 2 |
| RT-08 | Observation | PARTIAL | No ObservationBoundary | lib/observation/ (new) | Wave 3 |
| RT-09 | Knowledge | PARTIAL | No KnowledgeRecord pipeline | lib/knowledge/ (new) | Wave 2 |
| RT-10 | Understanding | PARTIAL | No CUM type | lib/understanding/ (extend) | Wave 2 |
| RT-11 | Civilization | PARTIAL | OVL-009 conflict | civilisation/ (extend) | Wave 2, 4 |
| RT-12 | Decision | PARTIAL | No ComplianceVerificationRecord | lib/decision/ (new) | Wave 2 |
| RT-13 | Action | PARTIAL | No EffectExpectationRecord | lib/action/ (new) | Wave 2 |
| RT-14 | Consequence | PARTIAL | No ConsequenceObservationRecord | lib/reflection/ (new) | Wave 2 |
| RT-15 | Domain (×12) | PARTIAL | GAP-15-001 (2 missing) | domains/ (extend) | Wave 3 |
| RT-16 | Amendment | STUB | GAP-16-001, -002 (entire pipeline) | lib/amendment/ (new) | Wave 3 |

---

*End of I1-RUNTIME-MAPPING.md*
*Document ID: I1-RUNTIME-MAPPING | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
