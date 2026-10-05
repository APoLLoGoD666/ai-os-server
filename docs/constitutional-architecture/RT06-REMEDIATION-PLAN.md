# RT06 — REMEDIATION PLAN
## Coordinated Multi-Document Remediation for DEF-001 through DEF-004

**Document:** RT06-REMEDIATION-PLAN.md  
**Subject:** R6-v1.0-canonical.md (Coherence Runtime, RT-06)  
**Date:** 2026-07-22  
**Authority:** RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md, RT06-ARCHITECTURAL-DECISION-RECORD.md  
**Prerequisite:** R6-CERTIFICATION-VERDICT.md (CONDITIONAL PASS)

---

## REMEDIATION OVERVIEW

Four material deficiencies require remediation across three documents. All three remediation streams may proceed in parallel; they converge only at R6 v1.1 certification.

| Stream | Document | Action | Priority |
|--------|----------|--------|----------|
| 1 | A0-v1.1-canonical.md | Targeted corrigendum to §3.7 | HIGH (fastest to complete) |
| 2 | A1-v1.0-canonical.md | Formal amendment (A1-AMEND-001) | HIGH (longest to complete) |
| 3 | R6-v1.1-canonical.md | Four section corrections | HIGH (merge point depends on S1, S2) |

**Merge point:** R6 v1.1 second certification review — requires S1 and S2 complete.

---

## STREAM 1 — A0 CORRIGENDUM

### Document: A0-v1.1-CORRIGENDUM-001

**Scope:** A0-v1.1-canonical.md §3.7 consumed objects description  
**Nature:** Factual correction to imprecise object naming; no structural change  
**Prerequisite:** None — can be issued immediately

### Specific Changes

**Location:** §3.7 RT-06 — Coherence Runtime  
**Subsection:** Consumed Constitutional Objects

**Current text (lines 718–719):**
> "All URO objects and relationships from RT-05 (read access); Stage 10 initiation signals from RT-03; Domain Understanding Models from RT-10 and RT-11."

**Corrected text:**
> "All URO objects and relationships from RT-05 (read access); Stage 10 initiation signals from RT-03; UnderstandingDegradationFlag from RT-10 (triggers coherence re-evaluation when domain understanding degrades)."

**Location:** §3.7 RT-06 — Coherence Runtime  
**Subsection:** Runtime Inputs

**Current text (lines 722):**
> "Stage 10 signals from RT-03; read access to Universal Object Graph from RT-05; Domain Understanding Model updates from RT-10 and RT-11 triggering re-evaluation."

**Corrected text:**
> "Stage 10 signals from RT-03; read access to Universal Object Graph from RT-05; UnderstandingDegradationFlag updates from RT-10 triggering coherence re-evaluation."

### Verification Criteria

- [ ] A0 §3.7 consumed objects no longer references "Domain Understanding Models from RT-10 and RT-11"
- [ ] A0 §3.7 now correctly names `UnderstandingDegradationFlag` from RT-10 as the triggering input
- [ ] A0 §3.7 does not list RT-11 as a source for RT-06 inputs
- [ ] A0 §3.10 RT-10 output specification (line 904) is consistent with corrected §3.7 — both name `UnderstandingDegradationFlag` to RT-06
- [ ] A0 §3.12 RT-11 shows no outbound connection to RT-06 — consistent with corrected §3.7
- [ ] No other A0 sections require consequential changes

### Corrigendum Document Template

```
A0-v1.1-CORRIGENDUM-001
Issued: [date]
Basis: RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md §3.5–§3.7 (DEF-002 adjudication)

Section corrected: §3.7 (RT-06 Coherence Runtime) — Consumed Constitutional Objects and Runtime Inputs
Nature: Factual correction — imprecise consumed-object naming

Corrections:
1. "Domain Understanding Models from RT-10" → "UnderstandingDegradationFlag from RT-10"
2. Remove "and RT-11" from both consumed objects and runtime inputs
Reason: A0 §3.10 RT-10 output specification is authoritative; it shows RT-10 sends
UnderstandingDegradationFlag (not DomainUnderstandingModel) to RT-06. A0 §3.12
RT-11 output specification shows RT-11 sends nothing to RT-06.
```

---

## STREAM 2 — A1 FORMAL AMENDMENT

### Document: A1-AMEND-001

**Scope:** A1-v1.0-canonical.md §5.1 + PAIR 08, 12, 16, 20, 23, 26  
**Nature:** Formal architectural amendment correcting systematic RT-06 identity error  
**Prerequisite:** None — can be initiated immediately  
**Note:** A1-AMEND-001 is the prerequisite for full R6 v1.1 RS-13 resolution

### Background

A1 v1.0 was authored with RT-06 characterized as "Event Stream Runtime" (AIR-1, Event domain). A0 v1.0 §2.15 already defined RT-06 as "Coherence Runtime" before A1 was authored. A1's characterization was incorrect at its creation date and is not correctable within R6 or through disclosure alone. A1 must be formally amended.

### Specific Changes Required

#### §5.1 Authority Graph — RT-06 Entry

**Current entry:**
> RT-06: Event Stream Runtime — AIR-1 (Observation) — Event domain

**Corrected entry:**
> RT-06: Coherence Runtime — Constitutional Mandate (D3 §4, D4 Stage 10) — No D6 AIR-N authority type. RT-06 holds constitutional mandate to evaluate all URO objects and relationships against GCR-1 through GCR-7 and to execute Stage 10 Post-Commit Coherence Evaluation within the Mandatory Propagation Window. Authority derives from D-series constitutional mandate, not from the D6 domain-actor authority type framework.

#### PAIR 08 — RT-01 / RT-06 Interaction

**Current characterization:** RT-06 captures RT-01 identity events as event stream entries  
**Action:** REVISE — under Coherence Runtime identity, RT-06 evaluates RT-01 identity events for GCR-5 (Identity Coherence Register) compliance during Stage 10. PAIR 08 must be restated as RT-06's coherence evaluation role in relation to identity objects admitted via RT-01.

#### PAIR 12 — [Source runtime] / RT-06 Interaction

**Current characterization:** RT-06 captures events  
**Action:** REVISE — restate as RT-06 performing GCR evaluation of newly admitted objects from the relevant source runtime

#### PAIR 16 — [Source runtime] / RT-06 Interaction

**Current characterization:** RT-06 captures these as the authoritative event log  
**Action:** REVISE — RT-06 does not hold an event log. The authoritative event sequence is in RT-05 (Reality Fabric). RT-06 evaluates fabric objects for GCR compliance and generates CoherenceResolutionEvents. Restate PAIR 16 under coherence evaluation framing.

#### PAIR 20 — RT-04 / RT-06 Interaction

**Current characterization:** RT-04 reads Event Stream (RT-06) for audit completeness  
**Action:** REVISE — RT-04 reads RT-06's coherence evaluation records (CREs, CCRs, CoherenceRegisters) for audit dimension 6 (Coherence Preservation). Restate as RT-04 auditing RT-06 coherence evaluation completeness.

#### PAIR 23 — RT-05 / RT-06 Interaction

**Current characterization:** Reality Fabric state change events are emitted to Event Stream (RT-06)  
**Action:** REVISE — RT-03 signals RT-06 at Stage 10 initiation; RT-06 reads RT-05 fabric state directly (read access to Universal Object Graph). RT-05 does not emit events to RT-06. Restate as RT-03 initiating Stage 10 → RT-06 reads RT-05 for coherence evaluation.

#### PAIR 26 — RT-07 / RT-06 Interaction

**Current characterization:** Temporal Coherence Runtime provides temporal ordering for events in RT-06; RT-06 provides event sequence to RT-07  
**Action:** REVISE — restate under Coherence Runtime identity: RT-06 produces CREs and coherence evaluation records in Stage 10 temporal sequence; RT-07 persists all RT-06 constitutional objects (CREs, CCRs, CoherenceViolationRecords, CoherenceRegisters) with full provenance. The RT-07 → RT-06 direction (temporal ordering for coherence records) should be assessed: does RT-06 require historical state from RT-07? Per A0 §3.7, RT-06 does not list RT-07 as a consumed-object source, so PAIR 26 in the RT-07 → RT-06 direction may have no basis under Coherence Runtime identity.

### Verification Criteria for A1-AMEND-001

- [ ] A1 §5.1 no longer lists RT-06 as "Event Stream Runtime"
- [ ] A1 §5.1 correctly characterizes RT-06 as "Coherence Runtime" with constitutional mandate from D3 §4 and D4 Stage 10
- [ ] A1 §5.1 confirms RT-06 holds no D6 AIR-N authority type
- [ ] PAIR 08, 12, 16, 20, 23 no longer describe RT-06 event stream capture/holding functions
- [ ] PAIR 08, 12, 16, 20, 23 correctly describe RT-06 coherence evaluation functions under Coherence Runtime identity
- [ ] PAIR 26 correctly describes RT-06 producing CREs and coherence records for RT-07 persistence
- [ ] No PAIR entry anywhere in A1 uses "Event Stream" to refer to RT-06
- [ ] A1-AMEND-001 is consistent with A0 v1.1 §3.7 (as corrected by A0-v1.1-CORRIGENDUM-001)

---

## STREAM 3 — R6 v1.1 SPECIFICATION

### Document: R6-v1.1-canonical.md

**Scope:** RS-06, RS-08, RS-09, RS-13 (four sections); RS-26 (dependency update); CERT-03, CERT-06 (re-issue)  
**Prerequisite:** None for RS-06, RS-08, RS-09; A1-AMEND-001 preferred for RS-13 (interim approach available)  
**Note:** R6 v1.1 requires second independent certification review per CONDITIONAL PASS verdict

### RS-06 — Authority Specification

**Current text (R6 v1.0 RS-06):**
> RT-06 holds Interpretation Authority (D6 §4.3). This authority grants RT-06 the constitutional right to evaluate whether constitutional objects are interpretively consistent with the system's registered ontological, epistemic, authority, value, temporal, identity, and provenance frameworks.

**Required replacement:**
> RT-06 holds no D6 domain-actor authority type (AIR-1 through AIR-5). RT-06's constitutional authority derives from direct D-series mandate:
>
> — **GCR Evaluation Mandate (D3 §4):** RT-06 is constitutionally appointed to evaluate all active URO objects and relationships against the seven Global Coherence Rules (GCR-1 through GCR-7). This mandate arises from D3 §4's requirement for mandatory continuous coherence evaluation across the reality fabric.
>
> — **Stage 10 Coherence Evaluation Mandate (D4 Stage 10):** RT-06 executes Post-Commit Coherence Evaluation at Stage 10 of every Class A operation, as mandated by D4. RT-03 initiates Stage 10; RT-06 executes evaluation and generates CoherenceResolutionEvents within the Mandatory Propagation Window.
>
> This authority framework is consistent with the pattern for infrastructure runtimes: RT-03 derives authority from D4 (Kernel Invariants, KOM); RT-05 derives authority from D3 (RF-A axioms); RT-06 derives authority from D3 §4 (GCR mandate) and D4 Stage 10 (coherence evaluation mandate). Infrastructure runtimes do not hold D6 domain-actor authority types (the sole exception is RT-04, which holds AIR-5 by explicit D6 design).
>
> **Note:** A1 v1.0 §5.1 assigns RT-06 AIR-1 (Observation) in "Event domain." This assignment reflects A1's erroneous "Event Stream Runtime" conception of RT-06 and does not apply. A0 v1.1 §3.7 and A0 §4.3 govern; neither assigns a D6 authority type to RT-06. A1-AMEND-001 addresses the A1 error.

**CERT-03 re-issue:** CERT-03 must be re-issued as PASS after RS-06 is corrected.

### RS-08 — Runtime Inputs

**Current state (R6 v1.0 RS-08):** Does not include inputs from RT-10. Stage 10 signals from RT-03 and RT-05 read access are present.

**Required addition:**

Add the following to RS-08's input enumeration:

> **UnderstandingDegradationFlag (from RT-10):** When RT-10 (Domain Intelligence Runtime) detects degradation in domain understanding quality, it emits `UnderstandingDegradationFlag` to RT-06. Receipt of this flag triggers coherence re-evaluation for the affected domain's CoherenceRegister. This re-evaluation proceeds outside of the standard Stage 10 cycle and may generate CoherenceViolationRecords and CREs if GCR thresholds are exceeded during the degraded-understanding period.
>
> **Note:** A0 v1.1 §3.7 (as corrected by A0-v1.1-CORRIGENDUM-001) names this trigger correctly. The original A0 §3.7 used the imprecise phrase "Domain Understanding Models from RT-10 and RT-11" — the correct object is `UnderstandingDegradationFlag` from RT-10. RT-11 does not send any object to RT-06; RT-11 is a downstream consumer of RT-06's coherence status outputs.

### RS-09 — Runtime Outputs

**Current state (R6 v1.0 RS-09):** Lists CRE and CCR outputs to RT-07 (persistence). Does not include RT-03 as output destination.

**Required addition:**

Add the following RT-03 entry to RS-09's output enumeration, and restructure the CRE/CCR routing to show the complete pipeline:

> **CRE (CoherenceResolutionEvent) — Routing:**
> 1. RT-06 generates CRE content during Stage 10 evaluation
> 2. CRE → RT-03 (Class B Kernel Manifest processing — D4 Class B KOM; CRE generation is a Class B operation)
> 3. RT-03 → RT-05 (CRE admitted to Reality Fabric stream)
> 4. RT-07 persists CRE as part of RT-05 object persistence pipeline
> 5. RT-04 reads CRE from RT-06's coherence evaluation records for audit dimension 6 (Coherence Preservation)
>
> **CCR (CoherenceConflictRecord) — Routing:**
> 1. RT-06 generates CCR on unresolvable violation or MPW breach
> 2. CCR → RT-03 (Class B Kernel Manifest processing — same pipeline as CRE)
> 3. RT-03 → RT-05 (CCR admitted to Reality Fabric stream)
> 4. RT-07 persists CCR
> 5. RT-04 reads CCR for audit
>
> **Constitutional basis:** A0 §3.7 Runtime Outputs: "CRE and CCR objects (to RT-03 for Class B processing, to RT-07 for persistence)." A0 §4.2 information flow: "RT-06 ─[CRE, CCR]─→ RT-03 (Class B) ─→ RT-05." A0 §4.4 execution order: "STEP XX: RT-03 processes all coherence outputs from RT-06 (Class B — CRE, CCR)." D4 Class B KOM: CRE generation = Class B.
>
> **Note on D4 language:** D4 states "CRE written to CRE stream; no further Class B processing." This means: after Class B admission, the CRE is in the RT-05 stream — no additional Class B steps are needed. It does not mean Class B processing is skipped.

### RS-13 — Runtime Interactions (PAIRs)

**Option A (preferred — requires A1-AMEND-001 complete):**
Adopt corrected A1 PAIR content. Add preamble disclosure of A1 v1.0 history. Verify each PAIR reflects Coherence Runtime identity.

**Option B (interim — if A1-AMEND-001 is not yet complete):**

Add the following preamble to RS-13:

> **A1 Identity Conflict Disclosure:** A1-v1.0-canonical.md characterizes RT-06 as "Event Stream Runtime" with AIR-1 (Observation) in "Event domain" throughout all PAIR descriptions. This characterization is constitutionally incorrect — A0 v1.0 §2.15 and A0 v1.1 §3.7 define RT-06 as "Coherence Runtime" and A0 §4.3 confirms RT-06 holds no D6 authority type. A1's "Event Stream Runtime" conception predates R6 and reflects an originating error in A1, not version drift. A1-AMEND-001 has been initiated to correct RT-06 identity throughout A1.
>
> **Governing authority for all PAIR content in this section:** A0 v1.1 §3.7. Where A1 PAIR content describes RT-06 in "Event Stream" terms, this R6 v1.1 provides constitutionally correct Coherence Runtime interaction descriptions, independent of A1's erroneous framing.

Then, for each PAIR entry sourced from A1 that uses Event Stream language (PAIR 08, 12, 16, 20, 23):
- Prefix with: `[A1 PAIR CONTENT CORRECTED — A1-AMEND-001 PENDING]`
- Provide the constitutionally correct Coherence Runtime interaction description
- State what the A1 v1.0 PAIR entry originally said, for traceability

For PAIR 26: retain the substantive interaction (RT-06 providing ordered coherence records to RT-07) with corrected framing.

**CERT-06 re-issue:** CERT-06 must be re-issued after RS-13 is corrected. If interim disclosure (Option B) is used for initial R6 v1.1, CERT-06 may be issued as CONDITIONAL PASS pending A1-AMEND-001 completion, with an explicit note that full CERT-06 PASS requires A1 amendment.

### RS-26 — Dependencies

**Current state (R6 v1.0 RS-26):** Lists RT-03 (Stage 10 initiation), RT-05 (URO object access).

**Required changes:**
- Add RT-10 as dependency: "RT-10 (UnderstandingDegradationFlag — triggers coherence re-evaluation on domain understanding degradation)"
- Do NOT add RT-11 as a dependency for input purposes (RT-11 is a downstream consumer of RT-06)

### Minor Deficiencies (DEF-005 through DEF-008)

Per R6-CERTIFICATION-VERDICT.md, four minor deficiencies (disclosures) must also be addressed in R6 v1.1. These are documented in R6-DEFICIENCY-REGISTER.md and require addition of informational notes at specified sections. They do not affect the core specification and can be addressed in a single editorial pass alongside the material deficiency corrections.

---

## VERIFICATION AND CERTIFICATION

### R6 v1.1 Pre-Certification Checklist

Before submitting R6 v1.1 for second independent certification review, verify:

**DEF-001 (RS-06) Resolution:**
- [ ] RS-06 no longer claims D6 §4.3 Interpretation Authority
- [ ] RS-06 correctly cites D3 §4 (GCR mandate) and D4 Stage 10 as constitutional authority basis
- [ ] RS-06 confirms RT-06 holds no D6 AIR-N type
- [ ] RS-06 notes A1 §5.1 AIR-1 assignment is superseded by A0 §3.7 and A1-AMEND-001
- [ ] CERT-03 re-issued as PASS

**DEF-002 (RS-08, RS-26) Resolution:**
- [ ] RS-08 includes UnderstandingDegradationFlag from RT-10 as a runtime input
- [ ] RS-08 explains the re-evaluation trigger mechanism
- [ ] RS-08 does not include RT-11 as a source for any input
- [ ] RS-08 notes A0 §3.7 corrigendum and correct object name
- [ ] RS-26 includes RT-10 dependency with correct object name

**DEF-003 (RS-09) Resolution:**
- [ ] RS-09 includes RT-03 (Class B processing) as CRE and CCR output destination
- [ ] RS-09 documents the complete routing pipeline: RT-06 → RT-03 → RT-05 → RT-07
- [ ] RS-09 cites A0 §3.7, §4.2, §4.4, and D4 Class B KOM as basis

**DEF-004 (RS-13) Resolution:**
- [ ] RS-13 contains preamble disclosure of A1 identity conflict
- [ ] RS-13 states A0 §3.7 governs PAIR content
- [ ] No PAIR entry in RS-13 describes RT-06 as holding or serving an event stream
- [ ] PAIR 08, 12, 16, 20, 23 content reflects Coherence Runtime identity (either from A1-AMEND-001 or independently authored)
- [ ] PAIR 26 correctly describes RT-06 providing coherence evaluation records (CREs) in temporal sequence to RT-07
- [ ] CERT-06 re-issued (PASS if A1-AMEND-001 complete; CONDITIONAL if interim)

**Minor Deficiencies (DEF-005 through DEF-008):**
- [ ] All four disclosure notes added per R6-DEFICIENCY-REGISTER.md specifications

**Source Document Prerequisites:**
- [ ] A0-v1.1-CORRIGENDUM-001 has been issued
- [ ] A1-AMEND-001 has been issued (or interim RS-13 disclosure approach confirmed)

### Second Certification Review Scope

Per R6-CERTIFICATION-VERDICT.md, the second certification review has limited scope:

> "Second certification review scope: verify only that remediations are correct and deficiencies are resolved. Core specification (already certified by this audit) does not require re-verification."

The second review MUST verify:
1. DEF-001 remediation (RS-06 authority characterization)
2. DEF-002 remediation (RS-08 UnderstandingDegradationFlag from RT-10; no RT-11 input)
3. DEF-003 remediation (RS-09 RT-03 Class B CRE/CCR routing)
4. DEF-004 remediation (RS-13 disclosure preamble + PAIR content correction)
5. DEF-005 through DEF-008 remediation (minor disclosures)
6. CERT-03 re-issue verification
7. CERT-06 re-issue verification
8. Consistency of R6 v1.1 with A0-v1.1-CORRIGENDUM-001 and A1-AMEND-001

The second review does NOT re-verify RS-01 through RS-05, RS-07, RS-10 through RS-12, RS-14 through RS-25, RS-27 through RS-36, CERT-01 through CERT-02, CERT-04, CERT-05, CERT-07 through CERT-10 (all previously certified as PASS).

---

## R7 AUTHORIZATION STATUS UNDER REMEDIATION

R7 (Memory Runtime, RT-07) was CONDITIONALLY AUTHORIZED in R6-CERTIFICATION-VERDICT.md. During remediation:

- R7 specification may proceed in parallel with all three remediation streams
- R7 must note in its preamble: "R6 v1.0 is under CONDITIONAL PASS status pending remediation of DEF-001 through DEF-004. R6 v1.1 remediation is in progress. R7 specification assumes R6 v1.1 will achieve unconditional certification."
- **DEF-003 impact on R7:** R7's dependency on RT-06 includes receiving CREs and CCRs for persistence. R7 must model receipt of CREs/CCRs that have already passed through RT-03 Class B processing — not raw CRE generation outputs. R7 RS-08 should specify: "CRE (from RT-03 Class B processing, originating at RT-06 Stage 10) — persists to RT-07 memory store."
- R7 CERT-10 (authorizing R8) requires R6 to have achieved unconditional certification status at time of issuance — this requirement is unchanged.

---

## REMEDIATION TIMELINE GUIDANCE

| Milestone | Prerequisite | Recommended order |
|-----------|-------------|-------------------|
| A0-v1.1-CORRIGENDUM-001 issued | None | First (fastest) |
| A1-AMEND-001 initiated | None | Immediately in parallel |
| R6 v1.1 RS-06 drafted | None | Immediately in parallel |
| R6 v1.1 RS-08 drafted | None | Immediately in parallel |
| R6 v1.1 RS-09 drafted | None | Immediately in parallel |
| R6 v1.1 RS-13 drafted (interim) | None (uses interim disclosure) | After RS-06/08/09 |
| A1-AMEND-001 completed | A1 review process | Before R6 v1.1 certification |
| R6 v1.1 RS-13 finalized (full) | A1-AMEND-001 | Last within R6 v1.1 |
| R6 v1.1 minor DEF-005–008 | None | During editorial pass |
| R6 v1.1 submitted for certification | A0 corrigendum + A1 amendment | After all above complete |
| R6 v1.1 second certification review | R6 v1.1 complete | Final step |
| R6 unconditional certification | Second review PASS | Unlocks R7 CERT-10 |

---

*RT06-REMEDIATION-PLAN.md — Produced: 2026-07-22*  
*Authoritative remediation guidance for R6 v1.1, A0-v1.1-CORRIGENDUM-001, and A1-AMEND-001.*  
*Authority: RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md, RT06-ARCHITECTURAL-DECISION-RECORD.md.*
