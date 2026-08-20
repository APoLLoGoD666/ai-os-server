# R16-SPECIFICATION-BASELINE.md
## Constitutional Phase 0 Research — RT-16 Amendment Runtime

**Document ID:** R16-SPECIFICATION-BASELINE  
**Authority Class:** Phase 0 Research Output — not a canonical R-series document  
**Generated:** 2026-07-24  
**Purpose:** Provide the complete constitutional baseline for writing R16-v1.0-canonical.md  
**Constitutional Authority Chain:** A0-v1.1.1 → A1-v1.2 → R0-v1.0  

---

## 1. EXECUTIVE SUMMARY — RT-16 CONSTITUTIONAL ROLE

RT-16 (Amendment Runtime) is the civilization's **sole mechanism for legitimate constitutional evolution**. It is the only runtime authorized to initiate, process, and publish constitutional amendments. It exists because D7 Part 12 establishes a Constitutional Amendment Architecture requiring a distinct runtime to govern that process — a runtime with exclusive Amendment Initiation Authority that no other runtime may exercise.

RT-16 is event-driven rather than continuously active. It is activated only upon receipt of an Amendment Proposal from RT-11 (the only constitutional initiator). Its constitutional function is procedural: it routes proposals through mandatory checks (AP-1 through AP-6 compliance), deliberation (RT-11), independent audit (RT-04 Preservation Audit), founding-level human authorization, and then publishes ratified amendments to the constitutional stack. It is the operational realization of the D-2 Forbidden Assumption that civilization cannot govern its own evolution without human oversight.

---

## 2. IDENTITY

| Field | Value | Source |
|-------|-------|--------|
| Canonical Name (A0) | Amendment Runtime | A0-v1.1.1 §3.17 |
| A1 Designation (§3.0) | Amendment Runtime | A1-v1.2 §3.0 |
| Conflict A0 vs. A1 name | NONE — both use "Amendment Runtime" | — |
| Runtime ID | RT-16 | A0-v1.1.1 §3.17 |
| A0 Tier | Tier 7 — Constitutional Maintenance | A0-v1.1.1 §3.1 |
| A1 Tier | T6 — Amendment Layer | A1-v1.2 §3.0 |
| Tier Conflict | PRESENT (minor): A0 calls it "Tier 7", A1 calls it "T6". Per authority precedence, A0 governs; A1's T6 represents an internal A1 numbering scheme. This conflict mirrors the established C-1 pattern in prior runtime specifications (R7, R15). Non-blocking. | A0-v1.1.1 §3.1; A1-v1.2 §3.0 |
| Constitutional Seat | A0-v1.1.1-canonical.md §3.17 | — |
| Layer | Layer 7: Constitutional Maintenance | A0-v1.1.1 §5.8 |
| Lifecycle Pattern | Event-driven (not continuously active) | A0-v1.1.1 §3.17 Note on Lifecycle |

---

## 3. RESPONSIBILITIES

Source: A0-v1.1.1-canonical.md §3.17 (verbatim)

**Total count: 11 responsibilities**

1. Receive Amendment Proposals from authorized actors (via RT-03)
2. Classify Amendment Proposals into one of four constitutional amendment classes (D7 Part 12): Class I (Operational), Class II (Structural), Class III (Foundational), or Class IV (Terminal Modification — proposals that would affect D-2's terminal commitments)
3. Verify Amendment Proposal compliance with AP-1 through AP-6 (all six requirements must be satisfied)
4. Route Amendment Proposal through constitutionally governed deliberation in RT-11
5. Request Preservation Audit from RT-04 (mandatory constitutional precondition for amendment ratification)
6. Route to founding-level authorization for ratification (human governance actors)
7. Publish ratified amendments to the constitutional stack
8. Maintain the Amendment Registry: all Amendment Proposals in all states (proposed, under deliberation, preservation audited, ratified, rejected)
9. Update the KernelOperationManifest through RT-03 if an amendment modifies Class B operations
10. Reject non-compliant Amendment Proposals with full RejectionRecord through RT-03
11. Route Class IV Amendment Proposals (Terminal Modification) to immediate constitutional rejection without opening any deliberation process; issue a RejectionRecord citing D7 A12.1 Constitutional Continuity Principle (D7 A12.1)

---

## 4. INVARIANTS

Source: A0-v1.1.1-canonical.md §3.17 (verbatim)

**Total count: 6 invariants**

- RT16-INV-1: No amendment is ratified without a Deliberation Record from RT-11
- RT16-INV-2: No amendment is ratified without a Preservation Audit from RT-04
- RT16-INV-3: No amendment is ratified without founding-level authorization from human governance actors
- RT16-INV-4: All six AP requirements (AP-1 through AP-6) must be satisfied before any amendment enters the deliberation phase
- RT16-INV-5: Amendment Proposals are never silently dropped — they are either ratified, rejected with a RejectionRecord, or remain in active process
- RT16-INV-6: Class IV amendments (Terminal Modification — any proposed change that would affect D-2's terminal commitments) are constitutionally inadmissible under the Constitutional Continuity Principle (D7 A12.1); RT-16 must classify such proposals as Class IV and route them to immediate constitutional rejection — no deliberation process is opened for Class IV proposals

---

## 5. OWNED OBJECTS

Source: A0-v1.1.1-canonical.md §3.17 (verbatim)

1. AmendmentProposal
2. AmendmentRegistry
3. RatifiedAmendmentRecord
4. AmendmentRejectionRecord

**Consumed Constitutional Objects** (A0 §3.17):
- DeliberationRecord (from RT-11 — amendment deliberation)
- PreservationAuditRecord (from RT-04 — mandatory precondition)
- gate processing results (from RT-03)
- founding-level authorization (from human governance actors)

**Produced Constitutional Objects** (A0 §3.17):
- RatifiedAmendmentRecord
- AmendmentRejectionRecord
- modified constitutional stack (the output of a ratified amendment)

---

## 6. AUTHORITY

### 6.1 Full Derivation Chain

**D6 §4 (Authority Type Definitions)**:
- §4.2: Observation Authority (AIR-1) — not held by RT-16
- §4.3: Interpretation Authority (AIR-2) — not held by RT-16
- §4.4: Decision Authority (AIR-3) — held: "Amendment" scope (constitutionally distinct from domain-level decisions)
- §4.5: Projection Authority (AIR-4) — not held by RT-16
- §4.6: Audit Authority (AIR-5) — not held by RT-16

**D6 §4.7 Authority Integrity Rules**: AIR-3 conflicts are resolved by scope: RT-03 holds Gate/Admit authority (operation-level); RT-11 holds Civilizational Decision authority (strategy-level); RT-16 holds Amendment authority (constitutional-level). These scopes are mutually exclusive (A1-v1.2 §5.2).

**A0 §4.3 Authority Relationship Graph**:
> "RT-16 holds: Amendment Initiation Authority — the exclusive authority to initiate constitutional modification"

**A1 §5.1 Authority Distribution Table** (verbatim row for RT-16):
| RT-16 | — | — | Amendment | — | — |

RT-16 holds AIR-3 in the Amendment domain only. It holds no AIR-1, AIR-2, AIR-4, or AIR-5 authority.

### 6.2 Authority Chain Summary (D6 → A0 → A1)

```
D6 §4.4 (Decision Authority — "constitutional right to form CivilizationalDecisions")
  ↓ [Specialized to Constitutional scope]
A0 §4.3 ("RT-16 holds: Amendment Initiation Authority — the exclusive authority to initiate constitutional modification")
  ↓
A1 §5.1 (RT-16 row: AIR-3 = Amendment authority type; AIR-1, AIR-2, AIR-4, AIR-5 = none)
  ↓
R16 RS-06: AIR-3 (Amendment scope) — no other authority types
```

Chain is **complete without gaps**. Authority type is derivable through all three levels.

---

## 7. DEPENDENCIES

Source: A0-v1.1.1-canonical.md §3.17 (verbatim list)

| Dependency | What RT-16 Receives | Certified Version |
|------------|--------------------|--------------------|
| RT-11 (Civilization Intelligence Runtime) | Deliberation — Amendment Proposals originate from RT-11; RT-11 provides DeliberationRecord | R11-v1.3-canonical.md — UNCONDITIONALLY CERTIFIED |
| RT-04 (Audit Runtime) | Preservation Audit — mandatory constitutional precondition | R4-v1.0-canonical.md — UNCONDITIONALLY CERTIFIED |
| RT-03 (Kernel Runtime / Constitutional Enforcement Kernel) | Gate processing for all Class A amendment operations | R3-v1.0-canonical.md — UNCONDITIONALLY CERTIFIED |
| RT-07 (Memory Runtime) | Historical amendment records | R7-v1.1-canonical.md — UNCONDITIONALLY CERTIFIED |

**R0 §9.2 Tier Ordering**: R16 depends on R11, R4, and R3 (as stated explicitly). R7 is also listed. All four certified.

**Note from A0 §4.1**: The dependency graph also shows RT-01 → RT-16 as a base dependency (RT-01 is a dependency for all runtimes per §4.1), though it is not listed in A0 §3.17's explicit Dependencies field. RT-03's gate processing requires RT-01 and RT-02; these are mediated dependencies, not direct.

---

## 8. DEPENDENTS

### 8.1 From A0 §3.17 (verbatim):
> "All runtimes are implicitly dependent on RT-16 for constitutional evolution; no runtime is a direct operational dependent."

### 8.2 From A0 §4.1 Dependency Graph:
The A0 §4.1 dependency graph shows:
```
RT-15 (Domain, x12) → RT-16 (domain deliberation participation in amendments)
```
Also: RT-16's outputs flow to the Constitutional stack (not to a specific runtime).

### 8.3 Conflict Note:
**C-1 (pre-identified)**: A0 §3.17 Dependents field states "no runtime is a direct operational dependent." A0 §4.1 shows RT-15 → RT-16. Resolution: Per R15-v1.0-canonical.md RS-27 and its Conflict C-3, both are authoritative for their purposes. A0 §3.17 is verbatim for the operational dependents field; A0 §4.1 provides the supplemental graph entry for RT-15. RS-27 in R16 must include both the A0 §3.17 verbatim and the A0 §4.1 supplemental entry.

**Additional implicit dependents** (all runtimes per §3.17): RT-01 through RT-15 all implicitly depend on RT-16 for constitutional evolution. The constitutional significance is that RT-03-INV-5 and RT-03-INV-7 require RT-16 for any modification to the Kernel Operation Manifest or suspension of the Kernel.

---

## 9. PAIR REGISTRY

Source: A1-v1.2-canonical.md §3.6 (Amendment Runtime Interactions)

All PAIRs involving RT-16 are in §3.6 (PAIR 59 through PAIR 63).

### PAIR 59: RT-16 ↔ RT-11 (Primary Amendment Trigger)
- Interaction: YES — Bidirectional — PRIMARY AMENDMENT TRIGGER
- RT-11 → RT-16: Amendment Proposal initiation. RT-11 is the ONLY runtime that may initiate an amendment process. Blocking: RT-16 activation does not block RT-11 further.
- RT-16 → RT-11: Amendment outcome (RATIFIED or REJECTED) returned for integration into future deliberation. Non-blocking.
- Derivation: M1 (D-7 §6.1), M2
- Permission Matrix (A1 §13.2): RT-11 row → RT-16 = DLVR; RT-16 row → RT-11 = RCVR

### PAIR 60: RT-16 ↔ RT-04 (Constitutional Preservation Audit)
- Interaction: YES — Bidirectional — CONSTITUTIONAL PRESERVATION AUDIT
- RT-16 → RT-04: Requests Preservation Audit. BLOCK — amendment cannot proceed without completion.
- RT-04 → RT-16: Provides Preservation Audit Record. May HALT the amendment if it would violate foundational constitutional principles.
- This is the only case where RT-04 produces output that directly gates another runtime's operation.
- Derivation: M1 (D-7 §6.1), M3
- Permission Matrix (A1 §13.2): RT-16 row → RT-04 = PADR; RT-04 row → RT-16 = ADIT (standard) + PADR (special Preservation Audit)

### PAIR 61: RT-16 ↔ RT-03 (Kernel-Mediated Amendment Commit)
- Interaction: YES — Special relationship
- All RT-16 amendment operations modifying constitutional text are highest-class operations; Kernel-mediated through RT-03 but with additional preconditions beyond standard Class A processing:
  1. RT-04 Preservation Audit complete (PAIR 60)
  2. RT-11 deliberation complete (PAIR 59)
  3. Founding-level human authorization obtained
  4. All six RT-03 gates pass
- RT-16 → RT-03: Amendment commit (Class A, highest constitutional weight)
- RT-03 → RT-16: Gate processing results
- Permission Matrix (A1 §13.2): RT-16 row → RT-03 = KRNL

### PAIR 62: RT-16 ↔ RT-05 (Kernel-Mediated)
- Interaction: YES — Kernel-mediated
- Amendment outcomes (ratified constitutional text) committed to RT-05 through RT-03. RT-16 does NOT directly write to RT-05.
- RT-05 row → RT-16 = PRVD (provides canonical state access)

### PAIR 63: RT-16 ↔ RT-04 (Audit of Amendment)
- Already covered by PAIR 60. RT-04 audits RT-16 in the standard AIR-5 pattern AND holds the special Preservation Audit authority over RT-16.

### Additional Interactions from A1 §13.2 Permission Matrix (RT-16 Row):
```
RT-16 row: NONE NONE KRNL PADR KRNL NONE NONE NONE NONE NONE RCVR NONE NONE NONE NONE SELF
```
- RT-03: KRNL (Kernel-mediated — all Class A operations)
- RT-04: PADR (Preservation Audit delivery/request)
- RT-05: KRNL (constitutional text commit via RT-03)
- RT-11: RCVR (receives amendment outcome)
- All others: NONE

### Forbidden Interaction (A1 §14.3):
- RT-16 self-initiation without RT-11 proposal: FORBIDDEN (D-7 §6.1)

### RT-04 Observation of RT-16 (Rule R1):
Per A1 §3.7 Rule R1: RT-04 → RT-16 EXISTS (AIR-5 observes all runtimes). This is universal.

---

## 10. CONSTITUTIONAL LOOP POSITION

Source: A1-v1.2-canonical.md §15.2

The A1 §15.2 Runtime-to-Loop-Phase Mapping table covers the standard 10-phase Constitutional Loop (Observation through Updated Understanding). RT-16 does not appear as a PRIMARY or SUPPORTING runtime for any of these standard phases. This is constitutionally correct and expected: RT-16 operates an out-of-band amendment process, not a standard Constitutional Loop cycle.

**A1 §12.8 Amendment Execution Order** establishes RT-16's own 15-step canonical execution sequence for the Amendment process — this is a distinct execution context from the standard Constitutional Loop.

| Standard Constitutional Loop Phase | RT-16 Classification |
|------------------------------------|-----------------------|
| Observation | ABSENT (no standard loop role) |
| Evidence | ABSENT |
| Knowledge | ABSENT |
| Understanding | ABSENT |
| Deliberation | ABSENT (RT-11 leads; RT-16 receives output from RT-11 — but this is amendment deliberation, not standard deliberation) |
| Decision | ABSENT |
| Action | ABSENT |
| Consequence | ABSENT |
| Observation of Consequence | ABSENT |
| Updated Understanding | ABSENT |

**Constitutional Foundation Layer Role**: Per A1 §15.2, RT-01, RT-02, RT-03, RT-04, RT-05, RT-06, RT-07 are present at every phase. RT-16 is not listed in the Constitutional Foundation Layer. However, RT-03 gates all RT-16 amendment commits, meaning RT-03 participates in the amendment loop even though RT-16 does not participate in standard Constitutional Loop phases.

**Loop Classification for RT-16 interactions** (per A1 §14.4):
- RT-04 Preservation Audit HALT is explicitly classified as a **Loop-Terminating interaction** ("terminates the loop without completion — exceptional").

---

## 11. EXECUTION ORDER

Source: A0-v1.1.1-canonical.md §4.4 (33-step Constitutional Loop)

RT-16 does NOT appear in the 33-step standard execution order. The standard Constitutional Loop (STEPS 01-33) covers the observation-to-action-to-consequence cycle. RT-16 operates in a separate amendment execution context.

**A1 §12.8 Amendment Execution Order (15 steps)**:
```
Step 1:  RT-11 deliberation produces Amendment Proposal (requires full deliberation cycle)
Step 2:  RT-11 → RT-16: Amendment Proposal delivered
Step 3:  RT-16 initiates Amendment Process
Step 4:  RT-16 → RT-04: Requests Constitutional Preservation Audit (BLOCK)
Step 5:  RT-04 performs Preservation Audit (may take extended deliberation window)
Step 6:  RT-04 → RT-16: Preservation Audit Record returned (PASS or HALT)
Step 7:  If HALT: Amendment process terminates; RT-11 notified; no further action
Step 8:  If PASS: Founding-level human authorization required (external to all runtimes)
Step 9:  Human authorization obtained and submitted through RT-08 → RT-03 as Class A
Step 10: RT-03 applies all 6 gates to Amendment Authorization
Step 11: RT-03 Stages 8+9: Amendment committed to RT-05 (constitutional text updated)
Step 12: RT-16 records ratification
Step 13: RT-04 records complete amendment audit trail
Step 14: RT-11 receives amendment outcome; deliberation context updated
Step 15: All affected runtimes receive amendment notification through RT-03 Stage 10 propagation
```

**A0 §4.4 Note**: RT-16 is implicitly present in A0 §4.4 discussions of what can modify constitutional text (RT-03-INV-5: "no new Class B type is added without RT-16 constitutional amendment"; RT-03-INV-7: "The Kernel cannot be suspended, bypassed, or disabled by any runtime operation; only by RT-16 amendment"). These are precondition references, not execution order positions.

---

## 12. AMENDMENT PROCESS DEFINITION

The constitutional amendment process that RT-16 governs is defined in:

| Source | Location | Content |
|--------|----------|---------|
| D7-v1.0-canonical.md | Part 12 (§12.1-§12.6) | Complete Constitutional Amendment Architecture |
| D7 §12.1 | Constitutional Continuity Principle | Class IV inadmissibility; evolution without violating terminal commitments |
| D7 §12.2 | Amendment Authority | Founding operators; domain input; D7 Deliberation; D4 Assessment |
| D7 §12.3 | Amendment Proposal Requirements (AP-1 through AP-6) | All six AP elements |
| D7 §12.4 | Amendment Review Process (6 stages) | Proposal → Deliberation → Preservation Audit → Approval → Publication → Transition |
| D7 §12.5 | Amendment Classes (I through IV) | Operational, Structural, Foundational, Terminal Modification |
| D7 §12.6 | New Document Authorization | Class II equivalent |
| D7 A12.1 | Constitutional Continuity Principle | Class IV constitutional inadmissibility |
| D8 §12 | Relationship to Future Documents | Production of new documents through D7 Part 12 process |
| D8 PROH-1 | No New Constitutional Categories | RT-16 is the only path |
| D8 PROH-9 | No Constitutional Constraint Override | Constitutional constraints require RT-16 amendment |
| D-2 | Forbidden Assumption | Civilization cannot govern its own evolution without human oversight |
| A0 §3.17 | RT-16's Constitutional Authority | D7 Part 12, D7 A12.1, D8 A12, D-2 |

**The amendment process is fully and substantively defined** in D7 Part 12. There is no gap in the process definition that would require RT-16 to invent procedural requirements.

---

## 13. CONFLICTS REGISTER

### C-1: A0 Tier vs. A1 Tier Designation
- **A0 §3.1 says**: Tier 7 — Constitutional Maintenance
- **A1 §3.0 says**: T6 — Amendment Layer
- **Nature**: A0 has 7 tiers; A1 uses a different (T1–T6) tier numbering scheme. A1 T6 = A0 Tier 7 for RT-16.
- **Resolution**: Per authority precedence (A0 > A1), A0 §3.1 governs for canonical tier designation. A1's T6 is an internal A1 organizational designation. Non-blocking.
- **Effect on R16**: RS-01 must state tier as "Tier 7 (Constitutional Maintenance)" per A0, with disclosure of A1's T6 designation.

### C-2: A0 §3.17 Dependents vs. A0 §4.1 Dependency Graph (RT-15)
- **A0 §3.17 says**: "no runtime is a direct operational dependent"
- **A0 §4.1 shows**: RT-15 → RT-16 (domain deliberation participation in amendments)
- **Nature**: Both sources within A0 are authoritative for their purposes. §3.17 addresses the operational dependent relationship; §4.1 addresses the complete graph.
- **Resolution**: Per established precedent in R15-v1.0-canonical.md (Conflict C-3), RS-27 should include both the §3.17 verbatim statement and the §4.1 supplemental RT-15 entry with disclosure. Non-blocking.
- **Effect on R16**: RS-27 requires dual-entry treatment with explicit C-2 disclosure.

### C-3: A1 §13.2 RT-04 Row for RT-16 vs. A1 §3.6 PAIR 60 Description
- **A1 §13.2 shows**: RT-04 row → RT-16 = ADIT (standard audit)
- **A1 §3.6 PAIR 60 says**: RT-04 holds "special Preservation Audit authority" over RT-16 beyond standard audit.
- **Nature**: The matrix shows only ADIT but PAIR 60 establishes a non-standard audit relationship.
- **Resolution**: PAIR 60 is the more specific provision; it controls. ADIT in the matrix represents the general AIR-5 audit; the Preservation Audit is characterized in PAIR 60 as a special case on top of ADIT. Both apply simultaneously. Non-blocking.
- **Effect on R16**: RS-13 PAIR 60 must explicitly characterize both the AIR-5 standard audit AND the special Preservation Audit gate authority.

---

## 14. FALSIFICATION RESULTS

| FA | Attempt | Result | Blocking? |
|----|---------|--------|-----------|
| FA-1 | A0 §3.17 Completeness | PASS — §3.17 exists with canonical name, 11 responsibilities, 6 invariants, 4 owned objects, 4 dependencies, 1 dependents field, constitutional purpose, D-series citations | NO |
| FA-2 | D-series Documents Present | PASS — D7-v1.0-canonical.md is present; all other cited documents (D-2 via D-2-v1.2-canonical.md, D8-v1.0-canonical.md) are present | NO |
| FA-3 | Authority Derivation Completeness | PASS — Complete chain: D6 §4.4 (Decision/Amendment authority type) → A0 §4.3 (RT-16 Amendment Initiation Authority) → A1 §5.1 (AIR-3 Amendment) → RT-16 RS-06 | NO |
| FA-4 | Loop Phase Assignment | PASS — A1 §15.2 does not assign RT-16 to any standard Constitutional Loop phase; this is constitutionally correct (RT-16 operates out-of-band). A1 §12.8 provides the complete amendment execution order. The absence from §15.2 is determinative, not silent. | NO |
| FA-5 | PAIR Coverage | PASS — PAIRs 59-63 cover all RT-16 interactions. RT-16's primary interactions (RT-11, RT-04, RT-03, RT-05) are all covered by explicitly numbered PAIRs in A1 §3.6. | NO |
| FA-6 | Amendment Process Definition | PASS — D7 Part 12 (§12.1-§12.6) fully defines the Constitutional Amendment Architecture including all 4 amendment classes, all 6 AP requirements, 6-stage review process, Preservation Audit, and Class IV inadmissibility. | NO |
| FA-7 | Dependency Resolvability | PASS — All 4 explicit dependencies (RT-11, RT-04, RT-03, RT-07) are certified runtimes with unconditional certification: R11-v1.3, R4-v1.0, R3-v1.0, R7-v1.1. | NO |
| FA-8 | Terminology Consistency | PASS — All terms in A0 §3.17 (Amendment Proposal, AmendmentRegistry, Preservation Audit, Class I-IV, AP-1 through AP-6, founding-level authorization, Constitutional Continuity Principle, Class IV Terminal Modification, Deliberation Record) are defined in D7 Part 12 or D-2. | NO |
| FA-9 | Constitutional Conflicts | PASS — Three conflicts identified (C-1, C-2, C-3), all resolvable within the authority precedence hierarchy. C-1 resolved by A0 > A1 precedence. C-2 resolved by §3.17 vs §4.1 dual-purpose recognition per precedent. C-3 resolved by PAIR > matrix specificity. | NO |
| FA-10 | PAIRs with Certified Runtimes Consistency | PASS — R15-v1.0-canonical.md RS-27/RS-32.5 references RT-16 consistently with A0 §3.17. R11-v1.3-canonical.md RS-27 lists RT-16 as a dependent consistent with A0 §3.11 and PAIR 59. RT12-v1.0-canonical.md RS-28 explicitly excludes RT-16 from RT-12's interaction scope (correct per A0 §3.17). | NO |

**All 10 falsification attempts FAILED to find a blocking condition.**

---

## 15. PRE-WRITE CONDITIONS

The specification agent writing R16-v1.0-canonical.md MUST satisfy the following conditions:

**SC-1** (Dual-Entry RS-27): RS-27 must reproduce A0 §3.17 Dependents verbatim ("no runtime is a direct operational dependent") AND add the A0 §4.1 supplemental entry for RT-15 with explicit C-2 disclosure.

**SC-2** (Tier Disclosure): RS-01 must state tier as "Tier 7 (Constitutional Maintenance)" per A0, with disclosure that A1 §3.0 designates "T6."

**SC-3** (Loop Phase Absence): RS-29 must explicitly state that RT-16 is ABSENT from all 10 standard Constitutional Loop phases, with constitutional basis. The absence is not an omission — it is the constitutionally correct classification. The amendment execution cycle (A1 §12.8) is a separate execution context.

**SC-4** (PAIR 60 Dual Authority): RS-13 entry for PAIR 60 must characterize both: (a) the standard AIR-5 audit (RT-04 → RT-16, universal), and (b) the special Preservation Audit gate authority (unique to RT-16, constitutionally necessary exception to RT-04's normal non-operational-output role).

**SC-5** (Class IV Immediacy): RS-12 internal processes must specify that Class IV proposals are routed to immediate rejection WITHOUT entering any deliberation process, citing D7 A12.1. This is not a standard rejection path — no AP-1 through AP-6 check is performed; the Class IV classification is itself the ground for immediate rejection.

**SC-6** (Amendment Process Traceability): RS-10 (Managed Objects) must trace each managed object type to its D7 Part 12 definition. The AmendmentRegistry state management must address all six proposal states: proposed, under deliberation, preservation audited, ratified, rejected, and Class IV-rejected.

**SC-7** (AP-1 through AP-6 Specification): RS-12 must specify the verification logic for all six AP requirements (AP-1: Identification; AP-2: Justification; AP-3: Preservation Assessment; AP-4: Precedence Analysis; AP-5: Implementation Pathway; AP-6: Reversibility Assessment) as defined in D7 §12.3.

**SC-8** (Event-Driven Lifecycle): RS-14 and RS-15 must model RT-16's event-driven lifecycle correctly — it is constitutionally inactive between amendment events but maintains the Amendment Registry continuously. RS-15 state machine must include at minimum: DORMANT (maintaining registry), PROPOSAL RECEIVED, AP VERIFICATION, DELIBERATION, PRESERVATION AUDIT, AWAITING AUTHORIZATION, RATIFIED, REJECTED, CLASS IV REJECTED.

**SC-9** (D7 Part 12 Six-Stage Review): RS-12 must implement all six D7 §12.4 stages: Proposal Submission → Deliberation → Preservation Audit → Approval → Publication → Transition.

**SC-10** (No Self-Initiation): RS-35 (Prohibited Responsibilities) must explicitly prohibit RT-16 self-initiation without RT-11 proposal, per A1 §14.3 Forbidden Interactions.
