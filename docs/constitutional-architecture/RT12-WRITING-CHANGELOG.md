# RT12-WRITING-CHANGELOG.md
## RT-12 Constitutional Specification — Writing Decisions Log
## Document Version: 1.0

**Status:** Final — Companion to RT12-v1.0-canonical.md
**Date:** 2026-07-24
**Governed by:** RT12-v1.0-canonical.md

---

## Purpose

This changelog records every significant authoring decision made during the production of RT12-v1.0-canonical.md. For each decision: section affected, decision made, constitutional basis, and any finding reference from Phase 0 baseline analysis.

---

## DECISION LOG

---

### D-01 — Canonical Name Selection

| Field | Value |
|-------|-------|
| Section(s) | RS-01, throughout |
| Decision | Canonical name is "Decision Runtime" — not "Constitutional Compliance Runtime" |
| Constitutional Basis | A0-v1.1.1-canonical.md §3.13 (highest authority). A0 §3.13 explicitly names RT-12 "Decision Runtime." A1-v1.2-canonical.md §3.0 and R0-v1.0-runtime-specification-standard.md §5.8 RNS-1 both name it "Constitutional Compliance Runtime" — these are lower-authority sources superseded by A0. |
| Finding Reference | Phase 0 BASELINE Section 1.2 (Name Comparison); Conflict C-1 in RS-12 |
| Effect | "Decision Runtime" is used throughout the specification. "Constitutional Compliance Runtime" appears exclusively in the RS-12 C-1 conflict disclosure. The RS-01 naming conflict note (CON-01) was written as a disclosure, not a resolution — the conflict is documented and A0's authority applied. |

---

### D-02 — Functional Model Determination

| Field | Value |
|-------|-------|
| Section(s) | RS-03, RS-05, RS-07, RS-08, RS-09, RS-12 |
| Decision | A0's decision-formation model governs. RT-12 forms CivilizationalDecision objects. A1's compliance-verification model (RT-12 produces Compliance Verification Records) is registered as Conflict C-2 and not used as the primary functional basis. |
| Constitutional Basis | A0 §3.13 Responsibilities R1–R10 (decision formation, OAR management); A0 §3.13 Owned Objects (CivilizationalDecision listed as RT-12 owned); A0 §4.4 Steps 19, 22 (RT-12 forms Decision, creates OAR entry). A0 governs by constitutional hierarchy. |
| Finding Reference | Phase 0 BASELINE Section 2.1 (Functional Character); Conflict C-2 in RS-12 |
| Effect | RS-05 uses the 10 A0 responsibilities verbatim. RS-07 lists CivilizationalDecision as RT-12's first owned object. RS-09's primary output is CivilizationalDecision, not Compliance Verification Record. A1's CVR terminology appears only in conflict disclosures. |

---

### D-03 — Verbatim Extraction of Responsibilities

| Field | Value |
|-------|-------|
| Section(s) | RS-05 |
| Decision | All 10 responsibilities are extracted verbatim from A0 §3.13. No paraphrase, no addition, no omission, no recharacterization. |
| Constitutional Basis | A0-v1.1.1-canonical.md §3.13 Responsibilities block (R1–R10); mandatory condition 1 from Phase 0 WRITING-READINESS-REPORT |
| Finding Reference | Phase 0 BASELINE Section 2 |
| Effect | RS-05 contains 10 verbatim responsibilities. The count matches A0 §3.13 exactly. A prohibition note is appended to RS-05 stating that no responsibilities may be added without A0 amendment. |

---

### D-04 — Verbatim Extraction of Invariants

| Field | Value |
|-------|-------|
| Section(s) | RS-20 |
| Decision | All 6 invariants are extracted verbatim from A0 §3.13. No paraphrase. D8 implementation invariants (INV-1 through INV-7) and CLI invariants (CLI-1 through CLI-4) are added as a second table in RS-20 (these are supplementary, not replacing A0 invariants). |
| Constitutional Basis | A0-v1.1.1-canonical.md §3.13 Invariants block (RT12-INV-1 through RT12-INV-6); D8-v1.0-canonical.md INV-1 through INV-7; D8 CLI-1 through CLI-4 |
| Finding Reference | Phase 0 BASELINE Section 9 |
| Effect | RS-20 contains 6 verbatim A0 invariants followed by D8 invariant mapping and CLI compliance table. |

---

### D-05 — Owned Objects Boundary (CivilizationalDecision vs. CivilizationalDecisionProposal)

| Field | Value |
|-------|-------|
| Section(s) | RS-07, RS-08, RS-10 |
| Decision | CivilizationalDecision is RT-12 owned (A0 §3.13 Owned Objects). CivilizationalDecisionProposal is RT-11 owned (A0 §3.12) and appears in RS-08 as a consumed input. These two objects are explicitly distinguished in RS-07 with a transformation chain diagram. |
| Constitutional Basis | A0 §3.13 Owned Objects; A0 §3.13 Consumed Objects; A0 §3.12 Produced Objects; R11-v1.3-canonical.md RS-07 and RS-10 (upstream boundary confirmation) |
| Finding Reference | Phase 0 BASELINE Section 4; Phase 0 WRITING-READINESS-REPORT High-Risk Area 2; Mandatory Condition 3 |
| Effect | RS-07 begins with the 4 owned objects from A0 §3.13. A "Transformation Chain" section explicitly maps the proposal-to-decision boundary. An "Explicitly NOT Owned by RT-12" section removes any ambiguity about CivilizationalDecisionProposal ownership. |

---

### D-06 — Authority Model — No AIR-3 for RT-12

| Field | Value |
|-------|-------|
| Section(s) | RS-06 |
| Decision | RT-12 holds AIR-2/Compliance (A1 §5.1). RT-12 does NOT hold AIR-3 (Decision Authority). RT-12 validates Decision Authority; it does not hold it. A full derivation chain (D6 → A0 §4.3 → A1 §5.1) is provided in RS-06. |
| Constitutional Basis | D6 §4.3 (Interpretation Authority definition); D6 §4.4 (Decision Authority definition); A0 §4.3 (RT-12 as validation point, not holder); A1 §5.1 (AIR-2/Compliance assigned); Mandatory Condition 4 and 5 from Phase 0 WRITING-READINESS-REPORT |
| Finding Reference | Phase 0 BASELINE Section 3; Phase 0 WRITING-READINESS-REPORT High-Risk Area 1; Conflict C-6 |
| Effect | RS-06 explicitly states RT-12 does not hold AIR-3. RS-06 contains the full D6 § → A0 → A1 authority derivation chain. RS-35 lists "RT-12 must not hold or exercise Decision Authority (AIR-3)" as a prohibited responsibility. |

---

### D-07 — D6 §4.7 AIR-N Notation Hazard Addressed

| Field | Value |
|-------|-------|
| Section(s) | RS-06 |
| Decision | A "CRITICAL NOTE" section within RS-06 explicitly distinguishes D6 §4.2–4.6 (authority types: AIR-1 through AIR-5 as Observation, Interpretation, Decision, Projection, Audit) from D6 §4.7 (Authority Integrity Rules: AIR-1 through AIR-5 as Authority Separation, No Unauthorized Projection, No Knowledge Monopolization, No Hidden Decisions, Audit Independence). These are never conflated in the specification. |
| Constitutional Basis | D6-v1.0-canonical.md §4.2–4.7; Phase 0 WRITING-READINESS-REPORT Additional Specification Guidance |
| Finding Reference | Phase 0 BASELINE Section 3.1 (critical distinction) |
| Effect | RS-06 contains an explicit notation hazard warning. All subsequent AIR-N references in the specification specify which system is being cited. |

---

### D-08 — Dependencies: Bijection with A0 §3.13

| Field | Value |
|-------|-------|
| Section(s) | RS-26 |
| Decision | RS-26 lists exactly the 4 dependencies from A0 §3.13 (RT-11, RT-03, RT-02, RT-07). RT-14 is excluded with explanation (classified as Dependent, not Dependency in A0 §3.13). RT-15 is excluded with explanation (PAIR 53 lacks A0 §3.13 basis). RT-01 is excluded with explanation (universal foundation service, not listed in A0 §3.13 Dependencies). |
| Constitutional Basis | A0-v1.1.1-canonical.md §3.13 Dependencies (verbatim); Mandatory Condition 6 from Phase 0 BASELINE; CERT-04 requirement (R0 Part 7.4) |
| Finding Reference | Phase 0 BASELINE Section 5; Phase 0 WRITING-READINESS-REPORT on CERT-04 |
| Effect | RS-26 contains 4 dependencies with a verbatim claim and count assertion. Exclusions table explains each non-inclusion. |

---

### D-09 — RT-14 Classification (Dependent + Feedback Provider)

| Field | Value |
|-------|-------|
| Section(s) | RS-27, RS-08, RS-12 (Conflict C-5) |
| Decision | RT-14 is classified as a Dependent of RT-12 (A0 §3.13 Dependents), not a Dependency. The TerminalStatusRecord delivery from RT-14 to RT-12 is characterized as a feedback flow from a Dependent, appearing in RS-08 (Inputs) rather than RS-26 (Dependencies). Both aspects of the RT-14 relationship are documented. |
| Constitutional Basis | A0 §3.13 Dependents; A0 §3.13 R8; RT12-INV-5; Phase 0 BASELINE Section 6.2 |
| Finding Reference | Phase 0 BASELINE Section 6; Conflict C-5 |
| Effect | RS-27 lists RT-14 as a Dependent with the explanation. RS-08 lists TerminalStatusRecord as an input from RT-14. RS-12 Conflict C-5 registers the classification ambiguity. |

---

### D-10 — PAIR 53 (RT-15) Treatment

| Field | Value |
|-------|-------|
| Section(s) | RS-13, RS-26, RS-27, RS-12 (Conflict C-4) |
| Decision | PAIR 53 is documented in RS-13 from A1 §3.5 as the authoritative PAIR source. RT-15 is excluded from RS-26 (Dependencies) and RS-27 (Dependents) because A0 §3.13 does not list RT-15. The conflict (PAIR 53 has no A0 §3.13 basis) is registered as C-4 in RS-12. PAIR 53's constitutional status is flagged for auditor review. |
| Constitutional Basis | A1-v1.2-canonical.md §3.5 PAIR 53 (source); A0 §3.13 Dependencies/Dependents (exclusion basis); A0 authority precedence |
| Finding Reference | Phase 0 BASELINE Section 8 (PAIR 53); Conflict C-4; Open Question OQ-1 |
| Effect | PAIR 53 is characterized in RS-13 with full C-4 disclosure block. RT-15 does not appear in RS-26 or RS-27. CERT-06 notes the constitutional status uncertainty and flags it for auditor review. |

---

### D-11 — Object Flow Direction (Who Submits to RT-03)

| Field | Value |
|-------|-------|
| Section(s) | RS-12 (Process 1, Conflict C-3), RS-13 (PAIR 43), RS-30 |
| Decision | A0 §3.13 R3 and A0 §4.4 Step 19 characterize RT-12 as the submitting party to RT-03. A1 §12.3 Step 10 characterizes RT-11 as the submitter; A1 PAIR 43 characterizes RT-03 as calling RT-12 as a Gate 5 helper. A0 governs. RS-12 Process 1 describes RT-12 submitting. PAIR 43 characterizes both the submission direction (RT-12 → RT-03) and the Gate 5 invocation (RT-03 → RT-12) as parts of the same operation. |
| Constitutional Basis | A0 §3.13 R3 ("Submit every CivilizationalDecision to RT-03"); A0 §4.4 Step 19 |
| Finding Reference | Phase 0 BASELINE Section 8 (PAIR 43 conflict note); Conflict C-3; Open Question OQ-4 |
| Effect | RS-30 (Execution Position) follows A0 §4.4 with explicit note of the A1 §12.3 conflict. RS-13 PAIR 43 documents both interaction directions. |

---

### D-12 — Loop Participation: SUPPORTING Only

| Field | Value |
|-------|-------|
| Section(s) | RS-29, RS-31 |
| Decision | RT-12 is Supporting in Deliberation and Decision phases only (A1 §15.2 verbatim). RT-12 has no Primary phases. The Decision phase Primary Runtime is RT-11 per A1 §15.2, even though A0's model would suggest RT-12 as more dominant in the Decision phase. A1 §15.2 governs loop participation classification. |
| Constitutional Basis | A1-v1.2-canonical.md §15.2; Mandatory Condition 6 from Phase 0 WRITING-READINESS-REPORT |
| Finding Reference | Phase 0 BASELINE Section 7 |
| Effect | RS-29 and RS-31 explicitly state RT-12 has no Primary phases. A reconciliation note in RS-31 explains the tension between A0's decision-formation model (suggesting RT-12 should be Primary in Decision) and A1 §15.2's classification of RT-11 as Primary. This tension is linked to Conflict C-2. |

---

### D-13 — A1 §12.7 Governance Execution Order Treatment

| Field | Value |
|-------|-------|
| Section(s) | RS-12 (Process 4) |
| Decision | A1 §12.7 (Governance Execution Order: RT-12 identifies compliance gaps, generates compliance alerts) is included in RS-12 as Process 4 — a lower-authority supplementary process. Its inclusion is conditional: where consistent with A0 §3.13 R10 (terminal state completion), it is incorporated; where it conflicts with A0's decision-formation model, A0 governs. |
| Constitutional Basis | A1-v1.2-canonical.md §12.7; A0 §3.13 R10; Phase 0 WRITING-READINESS-REPORT Additional Guidance on A1 §12.7 |
| Finding Reference | Phase 0 WRITING-READINESS-REPORT Additional Specification Guidance |
| Effect | RS-12 Process 4 is explicitly labeled as lower-authority and conditional. No conflict is hidden. |

---

### D-14 — Open Action Register Self-Closure Prohibition

| Field | Value |
|-------|-------|
| Section(s) | RS-10, RS-20, RS-21, RS-35 |
| Decision | RT12-INV-5 is treated as an absolute prohibition: RT-12 may never unilaterally close Open Action Register entries. This prohibition is explicitly stated in RS-10 (OAR lifecycle), RS-20 (invariants), RS-21 (FM-9), and RS-35 (prohibited responsibilities). Four separate sections reinforce this to prevent specification-level leakage. |
| Constitutional Basis | RT12-INV-5 (verbatim from A0 §3.13); Phase 0 WRITING-READINESS-REPORT High-Risk Area 4 |
| Finding Reference | Phase 0 WRITING-READINESS-REPORT High-Risk Area 4 |
| Effect | The prohibition appears in four RS sections. FM-9 in RS-21 specifically names "RT-12 Unilateral OAR Closure" as a failure mode. |

---

### D-15 — PAIR 43 Dual-Direction Characterization

| Field | Value |
|-------|-------|
| Section(s) | RS-13 (PAIR 43) |
| Decision | PAIR 43 is characterized with two directions within one operation: RT-12 submits CivilizationalDecision to RT-03 (per A0), and RT-03 invokes RT-12 at Gate 5 for ComplianceDeterminationRecord (per A1 PAIR 43). Both are documented in the P4 (Objects) field. Conflict C-3 is attached. |
| Constitutional Basis | A0 §3.13 R3 (submission direction); A1 §3.4 PAIR 43 (Gate 5 invocation direction); A1 §8.1 VC-5 |
| Finding Reference | Conflict C-3; Phase 0 BASELINE Section 8 (PAIR 43 ambiguity) |
| Effect | PAIR 43 in RS-13 reflects both interaction directions within the single Gate evaluation operation. The conflict is disclosed in-PAIR, and referenced to the RS-12 C-3 register. |

---

## OPEN QUESTIONS FOR AUDITOR

The following questions from the Phase 0 baseline (OQ-1 through OQ-5) were not fully resolved during specification authoring and are flagged for the independent certification auditor:

| OQ | Description | Where Disclosed |
|----|-------------|----------------|
| OQ-1 | PAIR 53 (RT-15 ↔ RT-12) lacks A0 §3.13 constitutional basis | RS-12 C-4; RS-13 PAIR 53 disclosure; CERT-06 note |
| OQ-2 | RT-14 permission matrix row does not show explicit delivery permission to RT-12 (potential matrix gap) | RS-12 C-5; RS-08 RT-14 input note |
| OQ-3 | Open Action Register relationship to D4 Class B KOM — whether OAR entry creation goes through RT-03 as a Class B operation or is a direct RT-12 write | RS-09 (Class B KOM path documented per A0 §3.13 R4 and Outputs) |
| OQ-4 | A1 §12.3 Step 10 implies RT-11 (not RT-12) is the submitter to RT-03 | RS-12 C-3; RS-30 conflict note |
| OQ-5 | Founding Actor not stated in A0 §3.13 | RS-01 (left as "Not stated in A0 §3.13") |

OQ-3 has been addressed in the specification (path confirmed as RT-12 → RT-03 Class B → RT-05 per A0 §3.13 R4 and Outputs). OQ-1, OQ-2, OQ-4, and OQ-5 remain open for the auditor.

---

*End of RT12-WRITING-CHANGELOG.md*
