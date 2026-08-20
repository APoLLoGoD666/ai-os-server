# C0 — CONSTITUTIONAL ERRATA REGISTER
## APEX Constitutional Architecture — Accepted Non-Blocking Errata for Frozen Baseline

---

## REGISTER IDENTIFICATION

| Field | Value |
|-------|-------|
| Register ID | C0-ERRATA |
| Audit Reference | C0-CONSTITUTIONAL-FREEZE-AUDIT.md |
| Freeze Baseline | APEX-CONSTITUTION-v1.0 |
| Register Date | 2026-07-25 |
| Purpose | Record all non-blocking deficiencies accepted into the frozen implementation baseline, with rationale for acceptance |
| Governing Standard | C0 freeze criteria: zero Class I; zero Class II; Class III/IV accepted with justification |

---

## SUMMARY

| Class | Count | Blocking? | Disposition |
|-------|-------|-----------|-------------|
| Class I — Critical Constitutional Defect | 0 | YES | None present |
| Class II — Material Certification Defect | 0 | YES | None present at freeze |
| Class III — Minor Defect | 4 | No | Accepted — see below |
| Class IV — Editorial/Advisory | 8+ | No | Accepted — see below |
| GS Class III (open editorial items) | 12 | No | Accepted — see below |
| **TOTAL ERRATA** | **24+** | | All accepted |

---

## CLASS III ERRATA (Minor — Does Not Block)

---

### C0-ERRATA-009
**Source Audit:** FAA-09-AUDIT-001
**Source Deficiency ID:** FAA-09-001
**Canonical Document:** R9-v1.0-canonical.md (RT-09, Knowledge Runtime)
**Location:** RS-06 (Authority Derivation)
**Description:** A0 §4.3 citation specificity gap in the RS-06 authority derivation chain. The chain is constitutionally correct in substance; the citation to A0 §4.3 lacks sufficient specificity to satisfy the full CERT-03 traceability standard.
**Constitutional Impact:** None. The authority held by RT-09 (AIR-1 and AIR-2 per A1 §5.1) is correctly characterized throughout. The chain produces the correct result.
**Rationale for Acceptance:** Citation specificity is an editorial/traceability matter. No constitutional substance is misstated. A future R9-v1.0.1 editorial revision can correct without re-certification.
**Remediation Path:** R9-v1.0.1 — add A0 §4.3 specific sub-citation to RS-06 derivation chain.

---

### C0-ERRATA-011A
**Source Audit:** FAA-11RF3
**Source Deficiency ID:** FAA-11RF3-001
**Canonical Document:** R11-v1.3-canonical.md (RT-11, Civilization Intelligence Runtime)
**Location:** RS-11 (Managed State), state variable `last_decision_ref`
**Description:** The state variable `last_decision_ref` is described as "Reference to most recent CivilizationalDecision — Updated on delivery." The constitutionally correct label is "Reference to most recent CivilizationalDecisionProposal delivered to RT-12" because at the point this variable is updated, RT-11 has delivered a Proposal; RT-12 has not yet formed the CivilizationalDecision (which is RT-12's exclusively owned object).
**Constitutional Impact:** Minor label imprecision. RT-11 makes no ownership, management, or production claim over CivilizationalDecision in any definitive statement; the error is confined to the state variable label. FAA-11RF3 explicitly confirmed this is not a Class I boundary violation.
**Rationale for Acceptance:** The imprecision exists in a state variable label within RS-11 only. The owned objects list (RS-07), the boundary definitions (RS-32, RS-35), and all operational provisions correctly exclude CivilizationalDecision from RT-11's scope. A reader tracing the specification's definitive statements will find the boundary correctly maintained.
**Remediation Path:** R11-v1.3.1 — correct `last_decision_ref` description and lifecycle note in RS-11 state table.

---

### C0-ERRATA-011B
**Source Audit:** FAA-11RF3
**Source Deficiency ID:** FAA-11RF3-002
**Canonical Document:** R11-v1.3-canonical.md (RT-11, Civilization Intelligence Runtime)
**Location:** RS-11 (Managed State)
**Description:** Second state variable imprecision in RS-11: state persistence language that does not precisely reflect the constitutional lifecycle of the relevant object.
**Constitutional Impact:** Minor imprecision in state variable characterization language. No definitive ownership or authority claim is affected.
**Rationale for Acceptance:** Same rationale as C0-ERRATA-011A. All definitive constitutional claims in RT-11 are correctly stated. This is a state variable documentation imprecision in RS-11.
**Remediation Path:** R11-v1.3.1 — correct state persistence language in RS-11 alongside FAA-11RF3-001 correction.

---

### C0-ERRATA-016A
**Source Audit:** FAA-16
**Source Deficiency ID:** FAA-16-002
**Canonical Document:** R16-v1.0-canonical.md (RT-16, Amendment Runtime)
**Location:** RS-13 (PAIR 59 P7, PAIR 60 P4, PAIR 61 P4); RS-16 (Entry Conditions)
**Description:** RS-13 and RS-16 cite "D-7 §6.1" as the constitutional basis for the amendment process and RT-11 → RT-16 interaction. D7 §6.1 is "Cross-Domain Reasoning Architecture" — unrelated to the amendment process. The correct citation is D7 Part 12 (Amendment Process; specifically §12.2 and §12.4).
**Root Cause:** Inherited from A1-v1.2-canonical.md §3.6 which itself incorrectly cites "D-7 §6.1." The specification faithfully reproduced A1's citation.
**Constitutional Impact:** The citation error exists only in PAIR derivation fields and entry conditions. The amendment process is fully and correctly characterized using D7 Part 12 citations throughout RS-12 (all six stages, all four classes, all AP requirements). Any implementer following RS-12 will correctly apply D7 Part 12.
**Rationale for Acceptance:** Constitutional substance is correct throughout. The error is a citation provenance issue inherited from upstream A1. Correcting it requires either an A1 amendment (to fix the source) or an editorial revision to RT-16 that notes the A1 discrepancy. Neither is required before implementation.
**Remediation Path:** A1-v1.2.1 — correct §3.6 citation from "D-7 §6.1" to "D7 Part 12" (§12.2, §12.4). R16-v1.0.1 — update RS-13 and RS-16 citations after A1 source correction.

---

## CLASS IV ERRATA (Editorial/Advisory — Advisory Only)

---

### C0-ERRATA-010A
**Source Audit:** FAA-10R
**Source Deficiency ID:** FAA-10R-001
**Canonical Document:** R10-v1.1-canonical.md (RT-10, Intelligence Runtime)
**Location:** RS-02 §2.1 (Constitutional Grounding)
**Description:** RS-02 contains "§XI (Philosophy of Intelligence)" as the D-2 section number. The correct section is D-2 §VII (Philosophy of Intelligence). Additionally, the correction note in RS-02 inverts the section titles of D-2 §VII and §XI in one sentence. All other D-2 citations in R10 correctly use "§VII."
**Constitutional Impact:** None. The four intelligence principles (instrumental, fallible, context-dependent, interpretable) are correctly characterized throughout RT-10. The error is isolated to an erroneous section reference in the correction note machinery of RS-02.
**Remediation Path:** R10-v1.1.1 — correct "§XI" to "§VII" in RS-02 and fix correction note inversion.

---

### C0-ERRATA-010B
**Source Audit:** FAA-10R
**Source Deficiency ID:** FAA-10R-002
**Canonical Document:** R10-v1.1-canonical.md (RT-10, Intelligence Runtime)
**Location:** RS-29 (Loop Participation), RS-31 (Phase Ownership)
**Description:** RT-10 characterized as "SUPPORTING" for the Decision phase. A1-v1.2 §15.2 does not list RT-10 in the Decision phase (Supporting = RT-12, RT-03). RT-10's Decision-phase obligations are constitutionally real (PAIR 32 P6/P8 — CUM state must be valid; RT-10 notifies RT-11 of CUM invalidation); the "SUPPORTING" characterization slightly overstates the formal A1 §15.2 table assignment.
**Constitutional Impact:** None affecting authority or boundary. RT-10 does not claim Decision authority (AIR-3). No constitutional violation exists. The obligations driving the characterization are real.
**Remediation Path:** R10-v1.1.1 — revise RS-29 and RS-31 Decision phase row to acknowledge RT-10's indirect obligations without using "SUPPORTING" where A1 §15.2 does not assign it. Possible characterization: "Indirect obligation (PAIR 32) — CUM validity required; RT-10 notifies RT-11 on CUM invalidation; not Primary or Supporting per A1 §15.2."

---

### C0-ERRATA-011C
**Source Audit:** FAA-11RF3
**Source Deficiency ID:** FAA-11RF3-003
**Canonical Document:** R11-v1.3-canonical.md (RT-11, Civilization Intelligence Runtime)
**Description:** Advisory observation from FAA-11RF3. No constitutional substance affected.
**Remediation Path:** R11-v1.3.1 editorial cycle.

---

### C0-ERRATA-011D
**Source Audit:** FAA-11RF3
**Source Deficiency ID:** FAA-11RF3-004
**Canonical Document:** R11-v1.3-canonical.md (RT-11, Civilization Intelligence Runtime)
**Description:** Advisory observation from FAA-11RF3. No constitutional substance affected.
**Remediation Path:** R11-v1.3.1 editorial cycle.

---

### C0-ERRATA-011E
**Source Audit:** FAA-11RF3
**Source Deficiency ID:** FAA-11RF3-005
**Canonical Document:** R11-v1.3-canonical.md (RT-11, Civilization Intelligence Runtime)
**Description:** Advisory observation from FAA-11RF3. No constitutional substance affected.
**Remediation Path:** R11-v1.3.1 editorial cycle.

---

### C0-ERRATA-013
**Source Audit:** FAA-13
**Source Deficiency ID:** FAA-13-001
**Canonical Document:** R13-v1.0-canonical.md (RT-13, Action Runtime)
**Location:** RS-20 (Invariants) RT13-INV-5; RS-05 R9
**Description:** A0 §3.14 cites "D5 PI-6" as the basis for RT13-INV-5 (consequence recording obligation). D5 PI-6 is "Boundary Integrity"; the semantically correct provision is D5 PI-5 (Consequence Recording). The error originates in A0 §3.14, not in R13. R13 correctly reproduces A0 verbatim per CERT-08 requirements and explicitly discloses the discrepancy.
**Constitutional Impact:** None. The constitutional substance of RT13-INV-5 (consequence signals are generated after Projection Boundary crossing; RT-08 is notified to enable RT-14 consequence observation) is correct. Only the upstream D5 citation is imprecise.
**Remediation Path:** A0-v1.1.2 amendment — correct §3.14 RT13-INV-5 citation from "D5 PI-6" to "D5 PI-5"; correct Responsibility 9 citation similarly. R13-v1.0.1 will update automatically after A0 amendment.

---

### C0-ERRATA-016B
**Source Audit:** FAA-16
**Source Deficiency ID:** FAA-16-001
**Canonical Document:** R16-v1.0-canonical.md (RT-16, Amendment Runtime)
**Location:** RS-02 (Constitutional Grounding)
**Description:** RS-02 cites "D7-v1.0-canonical.md §12.1 / Appendix A12.1." No "Appendix A12.1" exists in D7-v1.0-canonical.md. D7 §12.1 (The Constitutional Continuity Principle) exists as a regular section — not as an appendix.
**Constitutional Impact:** None. D7 §12.1 is correctly cited and correctly characterized. The "Appendix A12.1" designation is a fabricated sub-reference that adds nothing and misleads about nothing, since §12.1 itself is the correct primary citation.
**Remediation Path:** R16-v1.0.1 — remove "/ Appendix A12.1" from RS-02 D7 citation.

---

## GLOBAL BASELINE EDITORIAL ERRATA (GS-07 through GS-17 series)

These errata were identified in the GLOBAL-CONSTITUTIONAL-SYNCHRONIZATION-AUDIT.md (pre-RT-08 baseline audit) and recorded in GLOBAL-CONSTITUTIONAL-DEFICIENCY-REGISTER.md. They were explicitly out of scope for A1-AMEND-003. All are Class III editorial items with no constitutional substance impact.

| Errata ID | Source | Document | Description |
|-----------|--------|----------|-------------|
| GS-07 | Global Baseline | R0-v1.0 | §5.8 stale RT-06 name reference |
| GS-08 | Global Baseline | R6-v1.1.1 | A0 version reference not updated to v1.1.1 |
| GS-09 | Global Baseline | R6-v1.1.1 | RS-01 conflict note editorial |
| GS-10 | Global Baseline | R7-v1.1 | A0/A1 version reference not updated |
| GS-11 | Global Baseline | R7-v1.1 | RS-01 conflict note editorial |
| GS-12 | Global Baseline | R1-v1.1 | RS-02.13 version reference editorial |
| GS-13 | Global Baseline | R2-v1.0 | Version reference update needed |
| GS-14 | Global Baseline | R3-v1.0 | Version reference update needed |
| GS-15 | Global Baseline | A0-v1.1.1 | §3.8 inline Dependents editorial |
| GS-16 | Global Baseline | A0-v1.1.1 | §3.7 vs §4.2 CUM path description |
| GS-17 | Global Baseline | A0-v1.1.1 | §3.7 vs §4.2 CVR routing description |
| GS-19 | Global Baseline | R6-v1.1.1 | CERT-10 self-assessment reference update |

**Rationale for Acceptance of All GS Series:** These are version reference updates and editorial corrections with zero constitutional substance impact. The certified specifications remain constitutionally valid. Version references are records of what A-series version was operative at the time of specification — they do not affect the derivation or validity of constitutional claims. Correction is appropriate in future editorial revision cycles (R0-v1.0.1, R1-v1.1.1, R2-v1.0.1, R3-v1.0.1, R6-v1.1.2, R7-v1.1.1, A0-v1.1.2).

---

## ERRATA NOT REQUIRING REMEDIATION IN FROZEN BASELINE

The following items were considered but determined not to require any action:

1. **GLOBAL-CONSTITUTIONAL-BASELINE-CERTIFICATE-v1.1.md — Never produced:** The conditions for this certificate were satisfied by A1-AMEND-003 completion. The C0-CONSTITUTIONAL-FREEZE-DECLARATION formally subsumes its intended content. No separate action required.

2. **R8-v1.1 lacking a standalone CERTIFICATION-VERDICT document:** The R8-v1.1-FINAL-CERTIFICATION-AUDIT.md and R8-v1.1-FINAL-DEFICIENCY-REGISTER.md together constitute the complete certification record. The deficiency register explicitly declares "NO DEFICIENCIES FOUND" and the prior blocking finding (FIND-002) is confirmed resolved. The absence of a separately formatted verdict file does not affect the certification status of R8-v1.1-canonical.md.

---

## ERRATA ROUTING TABLE (Future Revision Cycles)

| Revision | Documents | Errata to Address |
|----------|-----------|-------------------|
| A0-v1.1.2 | A0-v1.1.1-canonical.md | C0-ERRATA-013 (source fix); GS-15, GS-16, GS-17 |
| A1-v1.2.1 | A1-v1.2-canonical.md | C0-ERRATA-016A (source fix for D7 §6.1 citation) |
| R0-v1.0.1 | R0-v1.0 | GS-07 |
| R1-v1.1.1 | R1-v1.1-canonical.md | GS-12 |
| R2-v1.0.1 | R2-v1.0-canonical.md | GS-13 |
| R3-v1.0.1 | R3-v1.0-canonical.md | GS-14 |
| R6-v1.1.2 | R6-v1.1.1-canonical.md | GS-08, GS-09, GS-19 |
| R7-v1.1.1 | R7-v1.1-canonical.md | GS-10, GS-11 |
| R9-v1.0.1 | R9-v1.0-canonical.md | C0-ERRATA-009 |
| R10-v1.1.1 | R10-v1.1-canonical.md | C0-ERRATA-010A, C0-ERRATA-010B |
| R11-v1.3.1 | R11-v1.3-canonical.md | C0-ERRATA-011A, C0-ERRATA-011B, C0-ERRATA-011C, C0-ERRATA-011D, C0-ERRATA-011E |
| R13-v1.0.1 | R13-v1.0-canonical.md | C0-ERRATA-013 (after A0-v1.1.2) |
| R16-v1.0.1 | R16-v1.0-canonical.md | C0-ERRATA-016A (after A1-v1.2.1), C0-ERRATA-016B |

---

*End of C0-CONSTITUTIONAL-ERRATA-REGISTER.md*
*Register ID: C0-ERRATA | Date: 2026-07-25*
