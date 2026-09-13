# RT06 — ARCHITECTURAL DECISION RECORD
## Constitutional Adjudication Decisions for DEF-001 through DEF-004

**Document:** RT06-ARCHITECTURAL-DECISION-RECORD.md  
**Subject:** R6-v1.0-canonical.md (Coherence Runtime, RT-06) — DEF-001 through DEF-004  
**Date:** 2026-07-22  
**Authority:** RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md  
**Companion:** RT06-REMEDIATION-PLAN.md

---

## ADR-001: RT-06 Constitutional Authority Characterization

**Status:** DECIDED  
**Date:** 2026-07-22

### Context

R6-v1.0-canonical.md RS-06 (Authority Specification) claims RT-06 holds "Interpretation Authority (D6 §4.3)." This claim appeared in the certification audit as DEF-001 (material deficiency).

Three candidate framings were evaluated:
1. RT-06 holds D6 §4.3 Interpretation Authority (AIR-2) — as stated in R6 v1.0
2. RT-06 holds D6 AIR-1 (Observation) in Event domain — as stated in A1 §5.1
3. RT-06 holds a constitutional mandate from D3 §4 and D4 Stage 10, not a D6 AIR-N type at all

### Decision

**RT-06 holds no D6 authority type. Its constitutional authority is a direct mandate from D3 §4 (Global Coherence Rule mandate) and D4 Stage 10 (Post-Commit Coherence Evaluation mandate).**

### Rationale

1. D6 §4.3 explicitly states Interpretation Authority "cannot be delegated to infrastructure runtimes." RT-06 is an infrastructure runtime (A0 §2, Tier 1). The R6 v1.0 claim is therefore constitutionally prohibited on its face.

2. A0 §4.3 (authority graph) does not include RT-06. This is not an omission — it is constitutional design. Infrastructure runtimes below Tier 3 (domain runtimes) do not hold D6 authority types except RT-04 (AIR-5 Audit, which D6 explicitly creates as an infrastructure-level authority type).

3. A1 §5.1's assignment of AIR-1 (Observation) to RT-06 is also incorrect, but for a different reason: it reflects A1's erroneous "Event Stream Runtime" conception of RT-06. Both the R6 v1.0 claim (AIR-2) and the A1 assignment (AIR-1) are wrong; neither is a valid alternative.

4. The comparator pattern is clear: RT-03 derives authority from D4 (Kernel Invariants, KOM). RT-05 derives authority from D3 (RF-A axioms). RT-06 derives authority from D3 §4 (GCR mandate) and D4 Stage 10. This is the consistent pattern for infrastructure runtimes — they derive authority from the D-series document that creates their function.

### Consequences

- R6 v1.1 RS-06 must remove D6 §4.3 citation and replace with: constitutional mandate from D3 §4 (authority to evaluate all URO objects against GCR-1 through GCR-7) and D4 Stage 10 (authority to execute Post-Commit Coherence Evaluation within the Mandatory Propagation Window).
- R6 CERT-03 must be re-issued confirming correct authority characterization.
- A1 §5.1 entry for RT-06 must be corrected as part of A1 formal amendment (separate process, see ADR-004).
- No change to A0 §4.3 is required — A0 §4.3 is correct in not listing RT-06.

---

## ADR-002: RT-10 and RT-11 Input Objects to RT-06

**Status:** DECIDED  
**Date:** 2026-07-22

### Context

R6-v1.0-canonical.md RS-08 (Runtime Inputs) does not include inputs from RT-10 or RT-11. The certification audit flagged this as DEF-002, citing A0 §3.7's statement that RT-06 consumes "Domain Understanding Models from RT-10 and RT-11."

Investigation revealed an internal inconsistency within A0 v1.1: A0 §3.7 says "Domain Understanding Models from RT-10 and RT-11," but A0 §3.10 (RT-10 output specification) shows RT-10 sends `UnderstandingDegradationFlag` (not `DomainUnderstandingModel`) to RT-06, and A0 §3.12 (RT-11 output specification) shows RT-11 does not output anything to RT-06.

### Decision

**Part A:** RT-06 receives `UnderstandingDegradationFlag` from RT-10. This triggers coherence re-evaluation when RT-10 detects understanding degradation. This must be added to R6 v1.1 RS-08 and RS-26.

**Part B:** RT-06 does NOT receive any object from RT-11. RT-11 is a downstream consumer of RT-06's outputs (coherence status). The A0 §3.7 claim of "Domain Understanding Models from RT-11" is incorrect. RT-11 must be removed from any R6 claim of RT-11 as a source for RT-06.

**Part C:** A0 §3.7's consumed-objects description requires a targeted corrigendum to reflect the correct object name (`UnderstandingDegradationFlag` from RT-10) and to remove RT-11 as an RT-06 source.

### Rationale

1. A0 §3.10 (per-runtime output specification for RT-10) is authoritative over the general consumed-objects description in A0 §3.7. §3.10 explicitly specifies what RT-10 sends to RT-06: `UnderstandingDegradationFlag`. §3.7's use of "Domain Understanding Models from RT-10" is an imprecise description of this trigger.

2. A0 §3.12 (per-runtime output/dependency specification for RT-11) confirms RT-11 is a dependent of RT-06, not a source for RT-06. RT-11's dependencies section includes "RT-06 (coherence status)." RT-11's Runtime Outputs do not include RT-06 as a destination. RT-11 sends nothing to RT-06.

3. The function described by A0 §3.7 is architecturally correct: when domain understanding degrades, coherence re-evaluation is warranted. The error in A0 §3.7 is the object name ("Domain Understanding Models") and the source scope (including RT-11). The underlying architectural design (RT-10 signals RT-06 when understanding degrades) is correct.

4. DEF-002b (the RT-11 sub-claim of DEF-002) is invalid as stated. The original DEF-002 finding was "A0 §3.7 explicitly lists Domain Understanding Models from RT-10 and RT-11 as consumed objects." The A0 §3.7 listing for RT-11 is itself an error in A0 §3.7.

### Consequences

- R6 v1.1 RS-08 must add: "`UnderstandingDegradationFlag` (from RT-10) — triggers coherence re-evaluation of domains experiencing understanding degradation."
- R6 v1.1 RS-26 must add RT-10 as a dependency with correct object name `UnderstandingDegradationFlag`.
- R6 v1.1 RS-08 and RS-26 must NOT add RT-11 as a source for inputs to RT-06.
- A0 v1.1 §3.7 corrigendum: Replace "Domain Understanding Models from RT-10 and RT-11" with "`UnderstandingDegradationFlag` from RT-10." Remove RT-11 from RT-06 consumed objects.
- The DEF-002 remediation from the CONDITIONAL PASS verdict must be interpreted as: add `UnderstandingDegradationFlag` from RT-10 only; do not add RT-11 input.

---

## ADR-003: CRE and CCR Routing Through RT-03 Class B Processing

**Status:** DECIDED  
**Date:** 2026-07-22

### Context

R6-v1.0-canonical.md RS-09 (Runtime Outputs) lists CRE and CCR outputs to RT-07 (persistence) but does not include RT-03 (Class B processing) as an output destination. The certification audit flagged this as DEF-003, citing A0 §3.7 and A0 §4.2.

### Decision

**RT-06 must route all CRE and CCR objects to RT-03 for Class B processing before RT-07 persistence. R6 v1.1 RS-09 must add RT-03 as a CRE/CCR output destination.**

### Rationale

1. A0 §3.7 Runtime Outputs explicitly: "CRE and CCR objects (to RT-03 for Class B processing, to RT-07 for persistence)." This is stated in RT-06's own A0 specification.

2. A0 §4.2 information flow graph: "RT-06 ─[CRE, CCR]─→ RT-03 (Class B) ─→ RT-05" — unambiguous routing path.

3. A0 §4.4 execution order: "STEP XX: RT-03 processes all coherence outputs from RT-06 (Class B — CRE, CCR)" — confirmed as a distinct execution step.

4. D4 Class B KOM: CRE generation is a Class B Kernel Manifest operation. All Class B operations are owned by RT-03 (A0 §3.3: "authority to generate all Class B Kernel Manifest outputs"). The fact that RT-06's Stage 10 evaluation triggers CRE generation does not exempt CREs from Class B processing.

5. Note on D4 language ("CRE written to CRE stream; no further Class B processing"): This refers to the CRE stream being the output destination after Class B processing — not that Class B processing is skipped. The "no further" language means: once written to stream, no additional Class B steps are needed. The stream is the RT-05 reality fabric stream, accessed via RT-03.

Three sources (A0 §3.7, §4.2, §4.4) and one D-series source (D4) are mutually consistent. No ambiguity exists.

### Consequences

- R6 v1.1 RS-09 must add: "CRE and CCR objects → RT-03 (Class B processing) → RT-05 (reality fabric admission) → RT-07 (persistence)"
- The full routing chain must be documented: RT-06 generates content; RT-03 executes Class B admission; RT-05 admits to fabric; RT-07 persists.
- No amendment to any source document required — all source documents are correct and consistent.
- R6 v1.1 RS-26 does not require changes for this DEF (RT-03 is already a dependency in R6 via Stage 10 initiation signal).

---

## ADR-004: A1 Identity Conflict and R6 RS-13 PAIR Content

**Status:** DECIDED  
**Date:** 2026-07-22

### Context

R6-v1.0-canonical.md RS-13 (Runtime Interactions — PAIRs) adopts content from A1 v1.0. A1 v1.0 characterizes RT-06 as "Event Stream Runtime" throughout, which conflicts with A0's "Coherence Runtime" definition. R6 adopted this content without disclosing the conflict. The certification audit flagged this as DEF-004.

### Decision

**Two coordinated actions are required:**

**Action A1 (A1 amendment):** A1 v1.0 must be formally amended to correct RT-06 identity. PAIR entries 08, 12, 16, 20, and 23 describe Event Stream functions that RT-06 does not hold under Coherence Runtime identity and must be revised or removed. PAIR 26 must be restated under Coherence Runtime identity.

**Action R6 (R6 v1.1 RS-13):** R6 v1.1 RS-13 must:
1. Add a preamble disclosing that A1 v1.0 characterized RT-06 as "Event Stream Runtime" and that A0 v1.1 §3.7 governs
2. Where A1 PAIR content describes Event Stream functions not held by the Coherence Runtime, remove or replace that PAIR content with constitutionally correct Coherence Runtime interaction descriptions
3. Where A1 PAIR content is substantively correct under Coherence Runtime interpretation (PAIR 26 — providing coherence evaluation records in temporal sequence to RT-07), retain with notation

### Rationale

1. A0 v1.0 §2.15 defined RT-06 as "Coherence Runtime" before A1 v1.0 was authored. A1's "Event Stream Runtime" characterization was wrong from its creation date. This is not version drift; it is an originating error in A1.

2. A1 PAIR entries 08, 12, 16, 20, and 23 describe a runtime that captures, holds, and serves event streams. These are functions the Coherence Runtime does not hold. The functions described in these PAIRs either do not exist in the system (if the Event Stream function is not otherwise allocated) or belong to a different runtime.

3. PAIR 26 ("Temporal Coherence Runtime provides temporal ordering for events in RT-06 / RT-06 provides event sequence to RT-07") can be constitutionally re-read as: RT-06 provides CREs and coherence evaluation records in Stage 10 temporal sequence to RT-07 for persistence. The underlying interaction (RT-06 providing ordered records to RT-07) is constitutionally valid — only the framing is wrong.

4. R6 cannot be unconditionally certified while its PAIR content adopts A1 descriptions of functions that RT-06 does not hold. The RS-13 preamble disclosure is the minimum fix; full correction requires A1 amendment.

5. A1 amendment and R6 v1.1 RS-13 are independent actions but should be sequenced: A1 amendment produces corrected PAIR content; R6 v1.1 RS-13 adopts that corrected content. If R6 v1.1 must be produced before A1 amendment, the interim disclosure and correction approach is sufficient for R6 v1.1 certification purposes, provided A1 amendment is formally initiated.

### Consequences

- A1 amendment must be initiated: scope is §5.1 authority graph + PAIR 08, 12, 16, 20, 23, 26.
- R6 v1.1 RS-13 must not simply copy A1 PAIR content for Event Stream entries. It must either: (a) await A1 amendment and adopt corrected content, or (b) independently author constitutionally correct PAIR descriptions under Coherence Runtime identity, with disclosure of A1 v1.0 history.
- R6 CERT-06 must be re-issued after RS-13 correction.
- The A1 amendment document should be designated A1-AMEND-001 and should cite this ADR as the adjudication basis.

---

## ADR-005: Overall Remediation Architecture

**Status:** DECIDED  
**Date:** 2026-07-22

### Context

ADR-001 through ADR-004 have determined that R6 v1.0 has four genuine deficiencies, A0 §3.7 has one targeted inconsistency requiring corrigendum, and A1 v1.0 has a systematic error requiring formal amendment. A remediation architecture is required to sequence these actions correctly.

### Decision

**Three-stream parallel remediation with controlled merge points:**

**Stream 1 — A0 Corrigendum (immediate):**  
Produce A0-v1.1-CORRIGENDUM-001 correcting §3.7 consumed objects (UnderstandingDegradationFlag from RT-10; remove RT-11 as RT-06 source). This is a factual correction, not a structural amendment. It can be issued immediately and proceeds independently.

**Stream 2 — A1 Amendment (parallel):**  
Produce A1-AMEND-001 correcting RT-06 identity throughout A1 v1.0 (§5.1, PAIR 08, 12, 16, 20, 23, 26). This is a substantive amendment requiring its own review. It proceeds in parallel with Stream 1 and Stream 3.

**Stream 3 — R6 v1.1 (parallel, with one merge dependency):**  
Produce R6-v1.1-canonical.md addressing DEF-001 (RS-06), DEF-002 (RS-08, RS-26), DEF-003 (RS-09), DEF-004 (RS-13).  
- RS-06, RS-08, RS-09 can be drafted immediately — no source document dependency.
- RS-13 has a soft dependency on Stream 2 (A1 amendment). If A1 amendment is not yet complete when R6 v1.1 is finalized, RS-13 must use the interim disclosure approach plus independent authoring of constitutionally correct PAIR content.

**Merge Point — R6 v1.1 Certification:**  
Before R6 v1.1 second independent certification review (per CONDITIONAL PASS requirement), both Stream 1 (A0 corrigendum) and Stream 2 (A1 amendment) must be complete, so that the R6 v1.1 certification can verify correct RS-08 against the corrected A0 §3.7, and correct RS-13 against the corrected A1 PAIR content.

### Rationale

The three streams are constitutionally independent at the drafting stage. Only at certification time does the dependency converge. Parallel execution minimizes total remediation time while ensuring the certification review can verify all corrections against correct source documents.

### Consequences

- A0 corrigendum is the fastest stream and should be issued first.
- A1 amendment is the most substantive and may take the longest; it should be initiated immediately.
- R6 v1.1 drafting should begin immediately for RS-06, RS-08, RS-09; RS-13 should be deferred to last within R6 v1.1 to allow maximum A1 amendment lead time.
- Second independent certification review of R6 v1.1 is required per the CONDITIONAL PASS verdict.
- R7 specification may proceed during all three streams; R7 must note R6 CONDITIONAL PASS status.

---

*RT06-ARCHITECTURAL-DECISION-RECORD.md — Produced: 2026-07-22*  
*Authoritative decisions for R6 v1.1 remediation. Source: RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md.*
