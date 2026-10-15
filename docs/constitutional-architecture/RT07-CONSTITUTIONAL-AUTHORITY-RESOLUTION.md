# RT07-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md
## RT-07 Constitutional Authority Resolution
### Resolving the A0 v1.1 / A1 v1.0 RT-07 Functional Divergence

**Adjudication subject:** RT-07 — Memory Runtime  
**Conflict class:** Identity and functional divergence between A0 v1.1 §3.8 and A1 v1.0 §5.1  
**Adjudication date:** 2026-07-22  
**Adjudicator:** Constitutional Auditor (Claude Sonnet 4.6)  
**Method:** Complete independent derivation from repository source files. No prior verdict inherited. All 15 source documents read and verified.

---

## PHASE 0 — REPOSITORY REALITY

### Document Existence (Verified)

| Document | Path | Status |
|----------|------|--------|
| A0-v1.1-canonical.md | constitutional-architecture/ | EXISTS (178.7K) |
| A1-v1.0-canonical.md | constitutional-architecture/ | EXISTS (96.0K) |
| R0-v1.0-runtime-specification-standard.md | constitutional-architecture/ | EXISTS (136.0K) |
| R1-v1.1-canonical.md | constitutional-architecture/ | EXISTS (222.5K) |
| R2-v1.0-canonical.md | constitutional-architecture/ | EXISTS (174.4K) |
| R3-v1.0-canonical.md | constitutional-architecture/ | EXISTS (154.1K) |
| R4-v1.0-canonical.md | constitutional-architecture/ | EXISTS (148.1K) |
| R5-v1.0-canonical.md | constitutional-architecture/ | EXISTS (151.5K) |
| R6-v1.1.1-canonical.md | constitutional-architecture/ | EXISTS (77.5K) |
| D2-v1.0-canonical.md | constitutional-architecture/ | EXISTS (39.7K) |
| D3-v1.0-canonical.md | constitutional-architecture/ | EXISTS (103.3K) |
| D4-v2.0-canonical.md | constitutional-architecture/ | EXISTS (85.9K) |
| D6-v1.0-canonical.md | constitutional-architecture/ | EXISTS (102.5K) |
| D7-v1.0-canonical.md | constitutional-architecture/ | EXISTS (103.6K) |
| **D8-v1.0-canonical.md** | constitutional-architecture/ | **EXISTS (84.7K) — CONFIRMED** |
| SOURCE-REGISTER.md | constitutional-architecture/ | EXISTS (4.5K) |
| CR1-v1.0-runtime-certification-review.md | constitutional-architecture/ | EXISTS (105.6K) |
| A1-AMEND-001 | constitutional-architecture/ | NOT FOUND — pending |

**D8 SOURCE GAP: RESOLVED.** D8-v1.0-canonical.md is a file-persisted canonical document at 84.7K. The gap identified in the R7 Foundation Audit is closed.

### Existing Certification and Remediation Records

| Document | Status |
|----------|--------|
| R6-v1.1.1-canonical.md | UNCONDITIONALLY CERTIFIED (2026-07-22) |
| R6-v1.1-CERTIFICATION-VERDICT.md | UNCONDITIONALLY CERTIFIED |
| R7-CONSTITUTIONAL-FOUNDATION-AUDIT.md | Completed (2026-07-22) — blocked pending this adjudication |
| RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md | Completed (2026-07-22) — RT-06 precedent |
| A1-AMEND-001 | PENDING — scope currently covers RT-06 identity only |

---

## PHASE 1 — CONSTITUTIONAL HIERARCHY ANALYSIS

### 1.1 Authority Ordering

The APEX constitutional hierarchy in descending authority:

```
D-series (D-1 through D8) — Supreme constitutional specifications
    ↓
A0 — Logical Architecture (instantiates D-series requirements)
    ↓
A1 — Interaction Architecture (specifies runtime interactions, subordinate to A0)
    ↓
R0 — Runtime Specification Standard (process document)
    ↓
R-series (R1 through R16) — Runtime Specifications (implement A0/A1 requirements)
```

**Key authority rules derived from this hierarchy:**

1. A0 is constitutionally superior to A1. A1 specifies interaction patterns among runtimes already defined in A0. A1 cannot re-define a runtime's identity, purpose, or authority in a way that contradicts A0.

2. A0 §3.x (the per-runtime specifications) are authoritative over A1 §5.1 (the runtime catalog). If A1's runtime catalog entry contradicts A0's §3.x entry, A0 governs.

3. R-series specifications derive from A0 and A1, with A0 taking precedence on identity, authority, and purpose. R-series specifications cannot resolve A0/A1 conflicts by deferring to A1 over A0.

4. D-series documents are the ultimate authorities on what functions each runtime class must perform. If no D-series document assigns a function to RT-07, A1 cannot validly assign it either.

### 1.2 Which Document Governs What

| Question | Authority |
|----------|-----------|
| RT-07 canonical name | A0 §3.8 (required verbatim by R0 RS-01) |
| RT-07 identity and purpose | A0 §3.8 |
| RT-07 constitutional authority type | A0 §4.3 (authority graph); D-series |
| RT-07 runtime interactions | A1 §5.1 and PAIRs — but subject to A0 §3.8 |
| Conflict resolution (A0 vs A1) | A0 governs; A1 requires amendment |
| Which runtime owns a disputed function | A0 §3.x definitions + D-series constitutional mandates |

### 1.3 Amending the Hierarchy

When A1 conflicts with A0, the correct resolution is:
- A0 is implemented as specified
- A1 is amended to align with A0
- R-series specifications are written per A0, with disclosure of pending A1 amendment

This is the precedent established by the RT-06 remediation (RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md). A0's designation of RT-06 as "Coherence Runtime" overrode A1's "Event Stream Runtime" designation. The same principle applies here.

---

## PHASE 2 — RT-07 IDENTITY AUDIT

### 2.1 Comparison Table — RT-07 Across Source Documents

| Source | Runtime Name | Purpose | Authority | Key Functions | Status |
|--------|-------------|---------|-----------|---------------|--------|
| **A0 v1.1 §3.8 (lines 741–783)** | **Memory Runtime** | Durable persistence of all constitutional objects and complete provenance chains; append-only historical records; historical query service | D-2 §XIII, D6 DOM-000004, D8 §5.7, D8 INV-2, PROH-4, PROH-5, D3 RF-A8 | Persist, provenance chains, historical queries, memory lifecycle | **AUTHORITATIVE** |
| A1 v1.0 §5.1 (line 183) | Temporal Coherence Runtime | Temporal ordering, sequence integrity | AIR-1 (Temporal domain) | Gate 6 attestation, temporal sequence records, temporal anchoring | CONFLICTS WITH A0 |
| R0 v1.0 (line 1206) | Temporal Coherence Runtime | (follows A1) | (follows A1) | (follows A1) | FOLLOWS A1 — INCORRECT |
| R1 v1.1 (line 2162) | Constitutional Temporal Authority Runtime | Temporal attestation | Temporal authority | Temporal attestation for identity operations | FOLLOWS A1 — INCORRECT |
| R2 v1.0 (lines 782, 1652) | Memory Runtime | Long-term historical preservation | — | Era-close authority archive persistence | MATCHES A0 — CORRECT |
| R3 v1.0 (throughout) | Memory/Archive Runtime (implicit) | Permanent archive and persistence | — | All runtime outputs persisted | MATCHES A0 — CORRECT |
| R5 v1.0 (throughout) | Temporal Runtime / Constitutional Temporal Runtime | Temporal ordering, TemporalStateSignal | Temporal authority | Temporal validity markers, TemporalStateSignal to RT-05 | FOLLOWS A1 — INCORRECT |
| R6 v1.1.1 (CERT-10) | Memory Runtime (A0 v1.1 §3.8) | — | — | Authorization chain target | MATCHES A0 — CORRECT |
| D8 v1.0 | (does not name runtimes by number) | — | — | §5.7 = Memory Preservation runtime capacity; INV-2 = append-only provenance | CORROBORATES A0 — no temporal ordering for RT-07 |
| D4 v2.0 | (does not name runtimes by number) | — | — | Gate 6 inputs: proposed operation, timestamp, ChangeRecords, HistoricalAnchor — no RT-07 | CORROBORATES A0 — Gate 6 internal to RT-03 |
| CR1 v1.0 | "Temporal attestation" (characterization in audit of RT-01) | — | — | RT-07 provides temporal attestation per A1 | FOLLOWS A1 — INHERITS A1 ERROR |

### 2.2 Summary Finding

**A0 §3.8 is the only canonical definition of RT-07.** A0 uses "Memory Runtime" exclusively. The phrase "Temporal Coherence Runtime" does not appear anywhere in A0 v1.1 (zero occurrences confirmed). A0's constitutional authority section for RT-07 cites D-2 §XIII (Philosophy of Memory), D6 DOM-000004 (Memory domain), D8 §5.7 (Memory Preservation), D8 INV-2 (Provenance Preservation), D8 PROH-4/5 (No provenance suppression/deletion), and D3 RF-A8 (Historical Inalienability). Not one of these constitutional anchors supports temporal ordering or attestation as a RT-07 function.

**A1's "Temporal Coherence Runtime" designation is an originating error.** It is not a different view of the same function — it is a different functional identity assigned to the same RT-07 slot. This is analogous to, but more severe than, the RT-06 "Event Stream Runtime" error: in the RT-06 case, A1's wrong name still described the same underlying evaluation function; in the RT-07 case, A1's characterization describes a fundamentally different service.

---

## PHASE 3 — FUNCTIONAL OWNERSHIP ANALYSIS

### 3.1 Temporal Attestation

**A0 owner:** Not assigned to any runtime as a named service. Gate 6 Temporal and Historical Integrity Validation is specified as an internal RT-03 evaluation in A0 §3.4 (line 516).  
**A1 owner:** RT-07 ("Temporal Coherence Runtime" owns temporal sequencing authority per A1 PAIR 17).  
**Constitutionally correct owner:** RT-03 (Gate 6, per A0 §3.4, D4 §4.6, R3 RT03-PROC-07).  
**Evidence:**
- A0 §3.4 line 516: "Gate 6 — Temporal and Historical Integrity Validation: verify temporal causality and historical integrity are preserved" — Gate 6 is listed as RT-03's own gate, with no external attestation input specified.
- D4 §4.6 (Gate 6) lists inputs: proposed operation, its asserted timestamp, ChangeRecords, HistoricalAnchor history. No "temporal attestation from RT-07" appears.
- R3 RT03-PROC-07 (line 626): "RT-03 performs this evaluation internally with access to the fabric's causal ordering records via RT-05." RT-07 not mentioned.
- A0 §3.8 (RT-07) contains 12 responsibilities, none of which include "provide temporal attestation for Kernel Gate 6."

### 3.2 Temporal Ordering

**A0 owner:** RT-03 Gate 6 enforces temporal causality (A0 §3.4, line 568: "D3 RF-A4 → Gate 6 enforces temporal causality"). RT-07 maintains temporal validity metadata on persisted objects (A0 §3.8 responsibility 7). These are two distinct activities: enforcement (RT-03) vs. metadata maintenance (RT-07).  
**A1 owner:** RT-07 ("Temporal Coherence Runtime" with "temporal ordering, sequence integrity" role per A1 §5.1).  
**Constitutionally correct owner:** RT-03 for enforcement; RT-07 for archival temporal metadata only.  
**Evidence:** A0 §8.5 (line 2019): "CLI-4 (Temporal coherence): RT-03 Gate 6 and RT-07 temporal validity enforce temporal ordering throughout." This is conjunctive — both contribute, but in different roles: RT-03 enforces via Gate 6; RT-07 maintains temporal validity metadata on archived objects.

### 3.3 Temporal Anchors (OPL Stage 2)

**A0 owner:** Not specified. A0 does not define "OPL Stage 2 Temporal Anchoring" as a function. D4's OPL stages are numbered differently; D5 defines the Observation Projection Lifecycle.  
**A1 owner:** RT-07 (PAIR 28 — RT-07 provides temporal anchor for OPL Stage 2).  
**Constitutionally correct owner:** The temporal anchor function described in A1 is not grounded in A0 or D4. To the extent temporal positioning is needed for Observation Records, A0 §3.9 (RT-08) states RT-08 carries "temporal position" attributes (line 795), which are maintained on the object itself — not provided by a separate runtime attestation. RT-07's legitimate role vis-à-vis RT-08 is providing historical state for contextualizing observations (A0 line 808, 824). "Temporal anchoring" is A1 terminology without A0 warrant.  
**Finding:** OPL Stage 2 temporal anchor is not a constitutionally grounded RT-07 function. RT-08 Observation Records carry temporal position as an attribute. RT-07 provides historical context, not temporal anchoring.

### 3.4 Temporal Sequence Records

**A0 owner:** Not defined. "Temporal Sequence Record" does not appear anywhere in A0 v1.1.  
**A1 owner:** RT-07 (A1 §6.1 line 1170: "Temporal Sequence Record | RT-07 | RT-03 (Gate 6), RT-09, RT-10, RT-11 | RT-07 (owned), RT-05").  
**Constitutionally correct owner:** No constitutional basis. "Temporal Sequence Record" is an A1-introduced object type with no D-series or A0 warrant. It cannot be included in any R-series specification without adjudication (and the adjudication here is that it should not exist as a separate object type — temporal ordering is enforced by Gate 6 internally via ChangeRecord/HistoricalAnchor, not via a separate Temporal Sequence Record).  
**Finding:** Temporal Sequence Record is an A1 artifact without constitutional grounding. It must be removed from A1 in the amendment.

### 3.5 Historical State

**A0 owner:** RT-07 (A0 §3.8: responsibility 3 "Provide historical state access to RT-09, RT-10, RT-11, and all other runtimes requiring historical context"; produced object HistoricalStateQueryResult).  
**A1 owner:** Not addressed in A1 PAIRs under this framing — A1 describes temporal functions instead of historical state functions.  
**Constitutionally correct owner:** RT-07.  
**Evidence:** A0 §3.8 lines 764–769, A0 lines 855, 898, 944 (RT-09/10/11 consuming HistoricalStateQueryResults from RT-07).

### 3.6 Provenance

**A0 owner:** RT-07 (A0 §3.8: responsibility 2 "Maintain append-only provenance chains for all persisted objects (D8 INV-2)"; owned object ProvenanceChain).  
**A1 owner:** Not addressed in A1 (A1 focuses on temporal functions, not provenance).  
**Constitutionally correct owner:** RT-07.  
**Evidence:** A0 §3.8 lines 761, 771 (RT07-INV-3); D8 INV-2; D8 PROH-4.

### 3.7 Persistence

**A0 owner:** RT-07 (A0 §3.8 entire purpose).  
**A1 owner:** Not directly characterized in A1 (A1 describes temporal functions for RT-07 instead).  
**Constitutionally correct owner:** RT-07.  
**Evidence:** A0 §3.8 lines 742–744, D8 §5.7, D-2 §XIII.

### 3.8 Memory Lifecycle

**A0 owner:** RT-07 (A0 §3.8 responsibility 6: "Manage constitutional memory lifecycle: Active → Archived (never deleted)"; owned object MemoryLifecycleRecord).  
**A1 owner:** Not addressed.  
**Constitutionally correct owner:** RT-07.

### 3.9 Temporal Integrity (Gate 6)

**A0 owner:** RT-03 (A0 §3.4, Gate 6; A0 §3.4 line 568: "Gate 6 enforces temporal causality").  
**A1 owner:** RT-07 as blocking dependency for RT-03 Gate 6 (PAIR 17).  
**Constitutionally correct owner:** RT-03 for evaluation authority; RT-05 as the data source (ChangeRecords, HistoricalAnchor history per D4 §4.6).  
**Evidence:**
- D4 §4.6 Gate 6 mandatory inputs: proposed operation, asserted timestamp, ChangeRecord and HistoricalAnchor history. These come from the fabric (RT-05), not from a temporal attestation runtime.
- R3 RT03-PROC-07 line 626: "RT-03 performs this evaluation internally with access to the fabric's causal ordering records via RT-05."
- R3 RS-08: No input from RT-07 listed for Gate 6. RT-07 does not appear as a Gate 6 dependency in R3.

### 3.10 Historical Reconstruction

**A0 owner:** RT-07 (HistoricalStateQueryResult provision; historical state access to RT-04 for audit).  
**A1 owner:** Not addressed.  
**Constitutionally correct owner:** RT-07.

### 3.11 Summary Ownership Table

| Function | A0 Owner | A1 Owner | Correct Owner | A1 Amendment Needed? |
|----------|----------|----------|---------------|----------------------|
| Temporal attestation for Gate 6 | RT-03 (Gate 6) | RT-07 | RT-03 | YES — remove from RT-07 |
| Temporal ordering enforcement | RT-03 (Gate 6) | RT-07 | RT-03 | YES — remove from RT-07 |
| Temporal anchors (OPL Stage 2) | Not defined in A0 | RT-07 | Not a separate service (attribute on objects) | YES — remove |
| Temporal sequence records | Not in A0 | RT-07 | Does not exist as object type | YES — remove object type |
| Temporal validity metadata on persisted objects | RT-07 (R7, resp. 7) | Not addressed | RT-07 | YES — add to RT-07 description |
| Historical state provision | RT-07 | Not addressed | RT-07 | YES — add to RT-07 PAIRs |
| Provenance chains | RT-07 | Not addressed | RT-07 | YES — add to RT-07 PAIRs |
| Persistence of all constitutional objects | RT-07 | Not addressed | RT-07 | YES — add to RT-07 PAIRs |
| Memory lifecycle management | RT-07 | Not addressed | RT-07 | YES — add to RT-07 PAIRs |
| Gate 6 temporal integrity | RT-03 | RT-07 → RT-03 blocking | RT-03 self-evaluated | YES — remove RT-07 blocking |
| Historical reconstruction for audit | RT-07 (RS-09) | Not addressed | RT-07 | YES — add to PAIR 21 |

---

## PHASE 4 — A1 PAIR AUDIT

### Assessment Framework

For each PAIR, the adjudication determines:
- **VALID:** A1 PAIR content is constitutionally grounded in A0 and may be adopted
- **INVALID — AMEND:** A1 PAIR content is incorrect; replacement content derivable from A0
- **INVALID — REMOVE:** A1 PAIR describes a function that does not exist constitutionally; PAIR should be removed
- **PARTIALLY VALID — REFRAME:** Direction or some content is correct; function characterization must change

---

### PAIR 09: RT-01 ↔ RT-07

**A1 description:** RT-07 provides temporal sequence attestation for identity operations. RT-01 → RT-07 initiation FORBIDDEN.  
**A0 grounding:** A0 §3.8 responsibility 1 ("persist all constitutional objects from all runtimes") + R1 RS-09 (RT-01 sends IdentityEndRecord to RT-07 and transfers complete Identity Audit Log to RT-07 for permanent archive at lifecycle close).  
**Assessment:** INVALID — AMEND  
**Reason:** The direction A1 describes (RT-07 → RT-01 provision) is backwards. A0 shows RT-01 sends records TO RT-07 for archival, not RT-07 providing services TO RT-01. The temporal attestation function is without A0 grounding. The prohibition on RT-01 initiating toward RT-07 is wrong per A0 — RT-01 initiates the archive transfer.  
**Required amendment:** Reverse direction. Remove temporal attestation. Replace with: RT-01 → RT-07 (unidirectional). RT-01 sends IdentityEndRecord and complete Identity Audit Log to RT-07 for permanent archival at actor lifecycle close per A0 §3.8 R1 and D8 §5.7. NON-BLOCK.

---

### PAIR 13: RT-02 ↔ RT-07

**A1 description:** RT-07 provides temporal context to RT-02 (same pattern as PAIR 09).  
**A0 grounding:** R2 v1.0 lines 786, 897: RT-02 transfers complete authority record archive to RT-07 at era-close. A0 §3.8 responsibility 1 (all runtime outputs persisted by RT-07).  
**Assessment:** INVALID — AMEND  
**Reason:** Same directional error as PAIR 09. RT-02 sends TO RT-07 at era-close, not RT-07 providing services to RT-02. Temporal context function is without A0 grounding.  
**Required amendment:** Reverse direction. Remove temporal context. Replace with: RT-02 → RT-07 (unidirectional, era-close only). RT-02 transfers complete authority record archive to RT-07 at era-close for permanent preservation per A0 §3.8 R1, R2 v1.0.

---

### PAIR 17: RT-03 ↔ RT-07

**A1 description:** Bidirectional. RT-07 → RT-03: BLOCKING temporal attestation for Gate 6. RT-07 "owns temporal sequencing authority; RT-03 cannot override temporal determination." RT-03 → RT-07: RT-03 registers committed operations in temporal record after Stage 9. NON-BLOCK.  
**A0 grounding:** 
- RT-03 → RT-07 (NON-BLOCK): GROUNDED. A0 §3.8 responsibility 10 ("Persist all RT-03 Class B outputs"); A0 §4.1 line 1245: "RT-03 → RT-07 (all memory writes)." After RT-03 Stage 9 commit, all outputs flow through RT-05 → RT-07 for durable persistence.
- RT-07 → RT-03 (BLOCKING Gate 6): UNGROUNDED. D4 §4.6 lists no RT-07 input for Gate 6. R3 RT03-PROC-07 (line 626) states Gate 6 is internal to RT-03 consulting RT-05. A0 §3.4 Gate 6 makes no mention of RT-07 attestation. A0 §3.8 lists no "provide Gate 6 temporal attestation" responsibility.  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** The RT-03 → RT-07 direction (persistence after Stage 9 commit) is constitutionally correct. The RT-07 → RT-03 BLOCKING Gate 6 attestation is constitutionally invalid. It contradicts A0 §3.4, D4 §4.6, and R3's explicit Gate 6 specification. "RT-07 owns temporal sequencing authority; RT-03 cannot override temporal determination" is an A1 fabrication with zero A0/D-series grounding.  
**Required amendment:** Remove RT-07 → RT-03 blocking direction. Retain RT-03 → RT-07 direction only. Change to: RT-03 → RT-07 (unidirectional). After Stage 9 commit, all RT-03 outputs (Class A and Class B) are written to RT-07 for durable persistence via the RT-05 admission pipeline. This is a HIGH-VOLUME, NON-BLOCK interaction occurring on every constitutional operation.

---

### PAIR 21: RT-04 ↔ RT-07

**A1 description:** RT-04 reads temporal records from RT-07. Class B audit read.  
**A0 grounding:** A0 §3.8 responsibility 9 ("Provide memory audit access to RT-04 — all historical records must be auditable"); A0 §3.8 line 780: RT-04 in dependents list. The direction (RT-04 reads FROM RT-07) is correct.  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** Direction is correct. "Temporal records" framing is incorrect — A0 specifies RT-04 reads ALL historical records for audit, not specifically "temporal records." The temporal framing is A1's artifact.  
**Required amendment:** Minimal. Reframe object from "temporal records" to "historical records." Replace with: RT-04 → RT-07 (unidirectional read). RT-04 reads all historical records and provenance chain segments from RT-07 for constitutional audit. Complete audit access with no modification rights. Class B audit read. NON-BLOCK.

---

### PAIR 24: RT-05 ↔ RT-07

**A1 description:** Bidirectional. RT-07 → RT-05: temporal sequence validation for RT-05 state changes. RT-05 → RT-07: RT-05 registers state change timestamps with RT-07.  
**A0 grounding:**
- RT-05 → RT-07: GROUNDED. A0 §4.1 line 1263: "RT-05 → RT-07 (fabric state changes for durable persistence)." RT-05 sends all fabric state changes to RT-07 for durable persistence.
- RT-07 → RT-05 (temporal validation): UNGROUNDED. A0 §3.8 contains no responsibility to validate RT-05 state changes temporally. D4 §4.6 assigns temporal validation to Gate 6 (internal to RT-03, consulting RT-05's ChangeRecord history). A0 §3.6 (RT-05) does not list RT-07 as providing temporal services to RT-05.  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** RT-05 → RT-07 direction is constitutionally correct (fabric state change persistence). RT-07 → RT-05 temporal validation is constitutionally invalid. R5 describes RT-07's "TemporalStateSignal" to RT-05 (line 543, 568) — this signal has no A0 §3.8 grounding.  
**Required amendment:** Remove RT-07 → RT-05 temporal validation direction. Make unidirectional. Replace with: RT-05 → RT-07 (unidirectional). RT-05 writes all fabric state changes (URO mutations, edge updates, coherence state) to RT-07 for durable persistence. This is the highest-volume RT-07 input. NON-BLOCK for RT-05 operation.

---

### PAIR 26: RT-06 ↔ RT-07

**A1 description:** Bidirectional. RT-07 → RT-06: temporal ordering for events in RT-06. RT-06 → RT-07: event sequence for temporal coherence validation.  
**A0 grounding:**
- RT-06 → RT-07: INDIRECTLY GROUNDED (via pipeline). A0 §3.7 outputs include "CoherenceViolationRecords (to RT-07 for persistence, to RT-04 for audit)" and CREs/CCRs route RT-06 → RT-03 → RT-05 → RT-07 per R6 RS-09. This is an indirect pathway, not a direct RT-06 ↔ RT-07 interaction.
- RT-07 → RT-06 (temporal ordering): UNGROUNDED. A0 §3.8 contains no responsibility to provide temporal ordering to RT-06. A0 §3.7 (RT-06) lists no RT-07 input (direct). R6 v1.1.1 RS-26 cites A1 PAIR 26 for an RT-07 temporal dependency — that citation is based on A1's incorrect characterization.  
**Assessment:** INVALID — AMEND  
**Reason:** The temporal ordering direction (RT-07 → RT-06) is constitutionally ungrounded. The "event sequence" characterization (RT-06 → RT-07) is wrong — RT-06 does not send events; its outputs (CREs, CCRs, CoherenceViolationRecords) flow through RT-03 → RT-05 → RT-07, not directly to RT-07. A1 PAIR 26 is an A1-introduced interaction based on the incorrect "Temporal Coherence Runtime" characterization of RT-07.  
**Required amendment:** Whether a direct RT-06 ↔ RT-07 PAIR exists at all must be reconsidered. If RT-06 accesses historical coherence records from RT-07 for GCR evaluation context (an A0-supportable function under §3.8 R3 "all runtimes requiring historical context"), PAIR 26 may be retained but wholly re-characterized. Replace temporal ordering / event sequence with: RT-07 → RT-06 (unidirectional, conditional). RT-07 provides HistoricalStateQueryResult to RT-06 when RT-06 requires historical coherence state for ongoing evaluation (e.g., evaluating temporal causality register GCR-4 requires access to object temporal validity metadata maintained by RT-07). NON-BLOCK. RT-06 → RT-07: indirect only (CRE/CCR outputs flow RT-06 → RT-03 → RT-05 → RT-07; no direct RT-06 → RT-07 pathway).

---

### PAIR 28: RT-07 ↔ RT-08

**A1 description:** RT-07 provides temporal anchor for OPL Stage 2 to RT-08.  
**A0 grounding:** A0 §3.9 (RT-08) line 808: "HistoricalStateQueryResult (from RT-07 — historical state for contextualizing observations)"; line 824: "RT-07 (historical state for contextualizing observations)." The direction (RT-07 → RT-08) is correct. The function is wrong: not "temporal anchoring" but "historical state for contextualizing observations."  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** Direction correct. "Temporal anchor" function is A1 terminology without A0 grounding. A0 §3.9 describes RT-08 receiving historical state context from RT-07, not a temporal anchor service.  
**Required amendment:** Reframe function. Replace "temporal anchor for OPL Stage 2" with "HistoricalStateQueryResult for contextualizing observations per A0 §3.9." NON-BLOCK.

---

### PAIR 37: RT-07 ↔ RT-09

**A1 description:** RT-07 provides temporal anchoring for Evidence Records to RT-09.  
**A0 grounding:** A0 §3.10 (RT-09) lines 851, 855, 870: RT-09 queries RT-07 for historical Knowledge States; RT-09 receives HistoricalStateQueryResult from RT-07. Direction (RT-07 → RT-09) is correct.  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** Direction correct. "Temporal anchoring for Evidence Records" is A1 terminology. A0 §3.10 shows RT-09 receiving historical Knowledge State queries, not temporal anchors.  
**Required amendment:** Reframe function from "temporal anchoring" to "HistoricalStateQueryResult provision for epistemic continuity — historical Knowledge States per A0 §3.10." NON-BLOCK.

---

### PAIR 38: RT-07 ↔ RT-10

**A1 description:** RT-07 provides temporal anchoring for DUM updates to RT-10.  
**A0 grounding:** A0 §3.11 (RT-10) lines 891, 898, 902, 912: RT-10 queries RT-07 for historical Understanding Models; receives HistoricalStateQueryResult.  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** Direction correct. Function wrong (temporal anchoring → historical Understanding Models).  
**Required amendment:** Reframe from "temporal anchoring for DUM updates" to "HistoricalStateQueryResult provision — historical Understanding Models for temporal continuity per A0 §3.11." NON-BLOCK.

---

### PAIR 39: RT-07 ↔ RT-11

**A1 description:** RT-07 provides temporal anchoring for Decision Records to RT-11.  
**A0 grounding:** A0 §3.12 (RT-11) lines 939, 944, 948: RT-11 queries RT-07 for historical CUMs and Deliberation Records; receives HistoricalStateQueryResult.  
**Assessment:** PARTIALLY VALID — REFRAME  
**Reason:** Direction correct. Function wrong (temporal anchoring → historical CUMs and Deliberation Records).  
**Required amendment:** Reframe from "temporal anchoring for Decision Records" to "HistoricalStateQueryResult provision — historical CUMs and Deliberation Records per A0 §3.12." NON-BLOCK.

---

### Missing PAIRs (in A1 but should exist per A0)

| Missing PAIR | A0 Basis | Required Addition |
|-------------|----------|-------------------|
| RT-07 ↔ RT-14 | A0 §3.15 lines 1085, 1091, 1101: RT-14 sends ObservedConsequenceRecords to RT-07 for persistence; RT-14 receives historical Understanding Models from RT-07 | Add to A1 amendment |

---

### PAIR Audit Summary

| PAIR | Verdict | Direction Correct? | Function Correct? | Amendment Action |
|------|---------|-------------------|-------------------|-----------------|
| 09 | INVALID — AMEND | NO (reversed) | NO (temporal → archival) | Reverse direction; replace function |
| 13 | INVALID — AMEND | NO (reversed) | NO (temporal → era-close archive) | Reverse direction; replace function |
| 17 | PARTIALLY VALID — REFRAME | PARTIALLY (RT-03 → RT-07 correct; RT-07 → RT-03 invalid) | RT-03 → RT-07 correct; Gate 6 blocking invalid | Remove RT-07 → RT-03 blocking; retain RT-03 → RT-07 persistence |
| 21 | PARTIALLY VALID — REFRAME | YES | PARTIALLY (temporal → historical) | Reframe object type |
| 24 | PARTIALLY VALID — REFRAME | PARTIALLY (RT-05 → RT-07 correct; RT-07 → RT-05 invalid) | Persistence side correct; temporal validation invalid | Remove RT-07 → RT-05; retain RT-05 → RT-07 persistence |
| 26 | INVALID — AMEND | NO (neither direction correct as described) | NO (both temporal) | Reconstitute as historical state provision or remove direct PAIR |
| 28 | PARTIALLY VALID — REFRAME | YES | NO (temporal anchor → historical state) | Reframe function |
| 37 | PARTIALLY VALID — REFRAME | YES | NO (temporal anchor → historical Knowledge States) | Reframe function |
| 38 | PARTIALLY VALID — REFRAME | YES | NO (temporal anchor → historical Understanding Models) | Reframe function |
| 39 | PARTIALLY VALID — REFRAME | YES | NO (temporal anchor → historical CUMs/Deliberation Records) | Reframe function |

---

## PHASE 5 — RUNTIME BOUNDARY ANALYSIS

### Option Analysis

**Option A: RT-07 remains Memory Runtime and A1 is corrected.**

Constitutional evidence: STRONG SUPPORT.
- A0 §3.8 unambiguously defines RT-07 as Memory Runtime with 12 specific responsibilities, all in the memory/persistence/provenance domain.
- No D-series document assigns temporal ordering authority to RT-07.
- Gate 6 temporal integrity belongs to RT-03 per D4 §4.6, A0 §3.4, R3.
- A1's temporal characterization is an originating A1 error.
- R2, R3, R6 (correctly specified runtimes) treat RT-07 as Memory Runtime.

This option is constitutionally correct. It requires A1 amendment of all 10 PAIRs and the §5.1 catalog entry, but the amendment content is fully derivable from A0 §3.8.

**Option B: RT-07 becomes combined Memory + Temporal Runtime.**

Constitutional evidence: NO SUPPORT.
- A0 §3.8 contains no temporal ordering responsibilities.
- Would require A0 corrigendum to add temporal responsibilities to §3.8.
- No D-series document (D3, D4, D8) authorizes temporal ordering as an RT-07 function.
- D4 §4.6 Gate 6 is internal to RT-03, requiring no RT-07 participation.
- Option B would merge incompatible constitutional mandates without D-series authority.

This option is constitutionally unsupported. REJECTED.

**Option C: Separate temporal runtime is required.**

Constitutional evidence: NO SUPPORT.
- A0's authority graph (§4.3) does not include a Temporal Authority Runtime separate from RT-03.
- D3's Temporal Register (Register 5) is a coherence register concept, not a separate runtime.
- Gate 6 is RT-03's function per D4 §4.6 and A0 §3.4.
- A0 defines no RT-07.5 or similar temporal coherence runtime.
- The temporal coherence function belongs to RT-03 (Gate 6) and is already constitutionally covered.

This option is constitutionally unsupported. REJECTED.

**Option D: Adjudication verdict is Option A with clarification.**

The temporal validity metadata function described in A0 §3.8 responsibility 7 ("Maintain temporal validity metadata for all persisted epistemic objects") is a legitimate RT-07 function. This is archival timestamp bookkeeping: RT-07 records when each persisted epistemic object was valid, its temporal bounds, formation timestamps, etc. This function contributes to CLI-4 enforcement (A0 §8.5) alongside RT-03 Gate 6. It is not temporal ordering authority — it is passive metadata maintenance.

**ADJUDICATION VERDICT: Option A — RT-07 is the Memory Runtime. A1 is corrected.**

All temporal ordering and attestation functions described by A1 for RT-07 are reassigned to their constitutionally correct homes:
- Gate 6 temporal integrity → RT-03 (already there per A0 §3.4, D4 §4.6, R3)
- Temporal metadata on persisted objects → RT-07 (A0 §3.8 responsibility 7, already correct)
- "Temporal Sequence Records" → removed (no constitutional basis)
- A1's 10 temporal PAIRs → corrected to memory/persistence/historical-state PAIRs per A0 §3.8

---

## PHASE 6 — CERTIFICATION IMPACT

### R5-v1.0 Certification

**Status:** R5's description of RT-07 as "Constitutional Temporal Runtime" providing TemporalStateSignals to RT-05 is constitutionally incorrect per this adjudication. However, R5 specification is CERTIFIED and not under revision.

**Impact:** The TemporalStateSignal from RT-07 to RT-05 (R5 RS-08 RT05-IN-09) describes a signal without A0 §3.8 grounding. R5's temporal validity mechanism for RT-05 (TemporalValidityRecord updated on TemporalStateSignal) has no A0 counterpart for RT-07. These represent R5 specifications built on A1's incorrect characterization.

**Action required:** NONE for R5 itself. R5 remains certified. When R7 is written as Memory Runtime, R5's temporal runtime descriptions will diverge from R7's actual scope. This divergence is historical — R5 predates this adjudication. A note in R7 RS-13 (PAIR 24) should disclose the R5 characterization conflict and its basis in A1's prior error.

**R5 citation error** (line 382: cites A0 §3.7 for RT-07 temporal authority; §3.7 is RT-06): Historical internal error. No action required — this doesn't affect R7 specification.

### R6-v1.1.1 Certification

**Status:** UNCONDITIONALLY CERTIFIED. Impact is MINOR.

**Specific issue:** R6 v1.1.1 RS-26 includes RT-07 as a dependency with characterization: "Temporal ordering: RT-07 provides temporal attestation required by RT-06 for GCR-4 (Temporal Causality) evaluation into Register 5 | PAIR 26."

This characterization is grounded in A1 PAIR 26 (which is being corrected by this adjudication). The characterization will become imprecise after A1 PAIR 26 is amended.

**However:** RT-06 does have a real dependency on RT-07 — RT-06 accesses historical coherence state from RT-07 (objects persisted by RT-07 carry temporal validity metadata; RT-06 reads this when evaluating GCR-4 Temporal Causality). The dependency ON RT-07 is valid. The temporal attestation characterization is imprecise.

**Certification impact:** NONE on the UNCONDITIONALLY CERTIFIED verdict. The operative dependency (RT-07 is a dependency of RT-06) is constitutional. The characterization is imprecise but not materially wrong for the purposes of the certified specification. A future R6 editorial maintenance release may correct this characterization, but it does not condition the current certification.

### R7 Authorization

**Status:** ACTIVE per R6 v1.1.1 CERT-10. No impact. R6 CERT-10 authorizes "RT-07 (Memory Runtime, A0 v1.1 §3.8)" — which is confirmed correct by this adjudication.

### A1 Certification Status

**A1 v1.0 contains material errors regarding RT-07** — the identity error ("Temporal Coherence Runtime") and all 10 PAIR function errors. These compound the RT-06 errors already identified. A1-AMEND-001 was initiated for RT-06 corrections. Its scope must be expanded to cover RT-07.

A1 v1.0 is not a certified document in the same sense as R-series runtimes (no R0 CERT-01 through CERT-10 equivalent). However, R-series specifications must conform to A1 PAIRs (CERT-06 requirement). Until A1 is amended, R-series specifications covering RT-07 must use the R6 precedent: disclose A1 identity conflict and document correct PAIR characterizations from A0.

### Future Runtime Development (R8 onward)

R8 through R16 specifications should not inherit A1's temporal RT-07 characterization. The amendment of A1 (via A1-AMEND-001 expanded scope) will provide corrected A1 as the baseline for R8 and beyond.

---

## RESOLUTION AND REQUIRED ACTIONS

### Constitutional Determinations

**DET-01:** RT-07 is the Memory Runtime. The canonical name is "Memory Runtime" per A0 v1.1 §3.8.

**DET-02:** A1's "Temporal Coherence Runtime" designation for RT-07 is an originating A1 error. It is not constitutionally supported by A0, D3, D4, D6, D7, or D8.

**DET-03:** Temporal ordering (Gate 6 enforcement) belongs to RT-03, not RT-07. D4 §4.6, A0 §3.4, and R3 RT03-PROC-07 all confirm Gate 6 as internal to RT-03 consulting RT-05. RT-07 is not a Gate 6 input.

**DET-04:** RT-07's temporal function is limited to A0 §3.8 responsibility 7: "Maintain temporal validity metadata for all persisted epistemic objects." This is archival bookkeeping, not ordering authority.

**DET-05:** "Temporal Sequence Record" is an A1-introduced object type with no D-series or A0 grounding. It does not exist constitutionally and must be removed from A1.

**DET-06:** All 10 A1 PAIRs for RT-07 require amendment. Correct characterizations are fully derivable from A0 §3.8 and A0's cross-references.

**DET-07:** D8 is a file-persisted canonical document (84.7K). The D8 SOURCE GAP identified in R7-CONSTITUTIONAL-FOUNDATION-AUDIT.md is RESOLVED.

**DET-08:** R7 specification may proceed as Memory Runtime. A1-AMEND-001 must be expanded to correct RT-07 and all 10 PAIRs. R7 RS-13 must contain full A1 conflict disclosure per the R6 precedent.

### Required Actions

| Action | Priority | Who |
|--------|----------|-----|
| Expand A1-AMEND-001 scope to include RT-07 identity correction and all 10 PAIR amendments | HIGH | A1 amendment process |
| Write R7-v1.0-canonical.md as Memory Runtime per A0 §3.8 | HIGH | R7 specification program |
| R7 RS-13: Include full A1 PAIRs conflict disclosure and document correct characterizations | HIGH | R7 specification program |
| R7 RS-06: Deny A1's AIR-1 temporal domain claim; state no AIR-N authority type | HIGH | R7 specification program |
| R5: Historical — no action required; error is pre-adjudication | LOW | None |
| R6: Historical — no action required on certified document; future editorial correction optional | LOW | Optional |

---

*RT-07 Constitutional Authority Resolution completed: 2026-07-22*  
*Adjudicator: Constitutional Auditor (Claude Sonnet 4.6)*  
*Verdict: RT-07 = Memory Runtime. A1 amendment required. R7 specification may proceed.*
