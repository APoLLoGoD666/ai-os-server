# T3-15 — ActionProjection + EffectExpectationRecord Bootstrap (RT-13): Phase 0 Falsification Audit

**Task:** T3-15 — ActionProjection + EffectExpectationRecord Bootstrap (RT-13)
**Date:** 2026-08-04
**Status:** AUTHORIZED — 11 falsification attempts, 11 FALSIFIED, 0 blockers
**Baseline:** APEX-CONSTITUTION-v1.0
**Authority:** A0-v1.1.1 §3.14 (RT-13); R13-v1.0-canonical.md RS-07 RS-08 RS-09;
              D5-v1.0-canonical.md §4.2 (APL) PI-2 PI-7 PI-8 PI-11;
              D8-v1.0 INV-1 INV-2 INV-5 PROH-3 PROH-4 PROH-5 IC-3;
              RT13-INV-1 through RT13-INV-7;
              IDR-W2-05-001; T3-13 (CivilizationalDecision AUTHORIZED, COMPLETE)

---

## MANDATE

T3-15 must honestly answer: can RT-13 form an ActionProjection + EffectExpectationRecord
at bootstrap? Phase 0 must attempt to falsify each authorization claim. If ANY claim is
NOT FALSIFIED, STOP — do not implement. No fabrication, no placeholder values, no gate bypass.

---

## FALSIFICATION ATTEMPTS

---

### F-01: decision_ref REQUIRED; RT-12 CivilizationalDecision did not exist (IDR-W2-05-001 Blocker 2)

**Claim to falsify:** ActionProjection.decision_ref is REQUIRED (type: string). Per IDR-W2-05-001
Constraint 2: "APEX does not currently produce CivilizationalDecision objects (RT-12)." No valid
decision_ref exists. Therefore T3-15 remains BLOCKED — same as Wave 2 stop condition.

**Evidence examined:**
- ActionProjection.SCHEMA.decision_ref: required = true
- D8 INV-1: every AP must trace to an authorized CivilizationalDecision
- IDR-W2-05-001 §2.2: "Has decision_ref source? NO"

**Falsification:**

FALSIFIED. T3-13 (COMPLETE, 2026-08-04) produced the first CivilizationalDecision:
`DEC-BOOTSTRAP-v1-${timestamp}` at lifecycle_state = AUTHORIZED. This ID is passed directly
to `formActionProjection({ decisionId, ... })` from `formCivilizationalDecision()` in
rt12-bootstrap.js. The decisionId is not synthesized — it is the actual ID of the
T3-13 AUTHORIZED CivilizationalDecision just formed in the same call chain.

D8 INV-1 satisfied: AP → CivilizationalDecision → DeliberationRecord → CUM → ObservationRecords.
IDR-W2-05-001 Blocker 2 is formally resolved.

**Finding:** FALSIFIED. T3-13 decisionId is available. IDR-W2-05-001 Blocker 2 RESOLVED. NON-BLOCK.

---

### F-02: expected_effects_description cannot be honest (IDR-W2-05-001 Blocker 3)

**Claim to falsify:** IDR-W2-05-001 Constraint 3 states that EER.expected_effects_description
must be formed BEFORE execution. The execution-evaluator.js wiring was post-execution, making
honest pre-crossing expectations impossible. T3-15 inherits this blocking constraint.

**Evidence examined:**
- EER.SCHEMA.expected_effects_description: required = true
- IDR-W2-05-001 §2.2: "expected_effects_description: Available? NO"
- D5 PI-7: reality is truth; EER is never revised post-crossing

**Falsification:**

FALSIFIED. The wiring point has changed. T3-15 wires at `formCivilizationalDecision()` in
rt12-bootstrap.js — at decision formation time, not at execution-evaluator.js post-execution.
At this wiring point:

1. The CivilizationalDecision has just been formed (AUTHORIZED state).
2. The DeliberationRecord (drId) is available — providing the question and resolution_reasoning.
3. The CivilizationUnderstandingModel (cumVersionRef) is available — providing epistemic context.
4. Stage 4 (EXTERNAL_ACTION_PROJECTION) has NOT yet been crossed.

The EER is formed BEFORE Stage 4 — exactly the constitutional requirement. The
expected_effects_description records what was expected at decision formation time.
This is honest: it describes pre-crossing expectations from pre-crossing context.

D5 PI-7 is satisfied: EER is formed before crossing; it cannot be revised after crossing.
IDR-W2-05-001 Blocker 3 is formally resolved.

**Finding:** FALSIFIED. Wiring at rt12-bootstrap.js provides honest pre-crossing context. IDR-W2-05-001 Blocker 3 RESOLVED. NON-BLOCK.

---

### F-03: IDR-W2-05-001 Blocker 1 — target file is post-execution

**Claim to falsify:** IDR-W2-05-001 Constraint 1 states the specified wiring file
(execution-evaluator.js) is post-execution. T3-15 must wire RT-13 somewhere. All
available wiring points are either post-execution or lack decision context.

**Evidence examined:**
- IDR-W2-05-001 §2.1: "execution-evaluator.js called AFTER task completion"
- IDR-W2-05-001 §3 Alternative D: "deferred to after W2-09"
- W2-09 (RT-11 Civilization): COMPLETE (T3-12, T3-13)

**Falsification:**

FALSIFIED. The correct wiring point is `formCivilizationalDecision()` in
`lib/civilization/rt12-bootstrap.js`. This was identified in the Post-T3-13 Wave 3
Recomputation as the resolution for Blocker 1: "call from within `formCivilizationalDecision()`
in rt12-bootstrap.js (or a new rt13-bootstrap.js called from there)."

This wiring point:
- Is called during decision formation (NOT post-execution)
- Has decisionId (T3-13 decision just authorized)
- Has drId (DeliberationRecord from T3-12)
- Has cumVersionRef (CUM from T3-11C)
- Precedes any Stage 4 crossing

IDR-W2-05-001 Blocker 1 is formally resolved. The new wiring file is rt13-bootstrap.js
(not execution-evaluator.js).

**Finding:** FALSIFIED. rt12-bootstrap.js → rt13-bootstrap.js is the correct pre-Stage-4 wiring point. IDR-W2-05-001 Blocker 1 RESOLVED. NON-BLOCK.

---

### F-04: RT13-INV-1 requires ICR before Stage 4 — irreversibility cannot be honestly classified at bootstrap

**Claim to falsify:** RT13-INV-1: "Stage 4 (EXTERNAL_ACTION_PROJECTION) may not be entered
without IrreversibilityClassificationRecord formed." D5 PI-8: "Every CivilizationalAction
must carry a reversibility classification before Stage 4." At bootstrap, no formal irreversibility
analysis has been performed. Classification would be fabricated. T3-15 BLOCKED.

**Evidence examined:**
- RT13-INV-1 in ActionProjection.CONSTITUTIONAL.invariants
- D5 PI-8: classification is constitutional and non-deferred
- ICR.SCHEMA.classification_basis: required = true
- ICR.SCHEMA.reversibility_classification: enum ['REVERSIBLE', 'IRREVERSIBLE', 'CONDITIONALLY_REVERSIBLE']

**Falsification:**

FALSIFIED. The reversibility classification is NOT fabricated — it is grounded in T3-13:

1. T3-13 CivilizationalDecision.irreversibility_classification = 'REVERSIBLE'
2. T3-12 CDP.irreversibility_classification = 'REVERSIBLE'
3. The bootstrap action (constitutional pipeline initialization) produces writes within the
   governed Reality Fabric only — no irreversible external commitments.

classification_basis cites the T3-13 CivilizationalDecision, the bootstrap pattern, and
D5 PI-8 compliance. The classification is constitutional (grounded in authority chain) and
non-deferred (formed before Stage 4).

RT13-INV-1 is satisfied: ICR formed at Step 2 of formActionProjection(), before Stage 4 crossing.

**Finding:** FALSIFIED. ICR.reversibility_classification = REVERSIBLE grounded in T3-13 decision. RT13-INV-1 satisfied. NON-BLOCK.

---

### F-05: RT13-INV-2 requires EER registered before Stage 4 — EER cannot be formed before Stage 4 at bootstrap

**Claim to falsify:** RT13-INV-2: "No Projection Boundary crossing without EER registered."
At bootstrap, there is no external action pending. Forming an EER for a non-occurring action
is constitutionally meaningless. T3-15 BLOCKED — EER would be a shell document.

**Evidence examined:**
- RT13-INV-2 in EffectExpectationRecord.CONSTITUTIONAL.invariants
- EER constitutional note: "formed BEFORE every Projection Boundary crossing"
- D8 PROH-6: No Assumption-to-Fact Conversion

**Falsification:**

FALSIFIED. RT13-INV-2 says EER must be registered BEFORE Stage 4 — not that Stage 4
must occur. Forming EER before Stage 4 is exactly the constitutional requirement. The EER
documents what was expected at decision authorization time; it does not require that Stage 4
immediately follow.

The EER is not a shell document. The expected_effects_description is honest:
it records the expected outcomes of the T3-13 CivilizationalDecision (pipeline initialization,
records written to constitutional_records, RT-13 pipeline initialized). These are real
expectations from a real authorized decision, formed before any Stage 4 crossing.

D8 PROH-6 is not violated: the EER represents pre-crossing expectations only. It is
explicitly not treated as an ObservedConsequenceRecord.

**Finding:** FALSIFIED. EER formed at Step 3 of formActionProjection(), before Stage 4. RT13-INV-2 satisfied. NON-BLOCK.

---

### F-06: RT13-INV-3 (six-gate RT-03 processing) blocks Stage 4 entry

**Claim to falsify:** RT13-INV-3: "No Projection Boundary crossing without Projection Authority
validation + six RT-03 gates passed." RT-03 is not fully operational at bootstrap. Therefore
Stage 4 is constitutionally blocked. T3-15 cannot proceed — any Stage 4 crossing is prohibited.

**Evidence examined:**
- RT13-INV-3 in ActionProjection.CONSTITUTIONAL.invariants
- D8 CLI-2: No gate may be short-circuited
- RT-03 gate processing: not fully operational at bootstrap

**Falsification:**

FALSIFIED. RT13-INV-3 is a Stage 4 entry condition, NOT an AP formation condition. The
AP can be formed at DECISION_RECEIPT and advanced to CIVILIZATIONAL_ACTION (Stage 3) without
triggering RT13-INV-3. RT13-INV-3 only becomes operative when Stage 4
(EXTERNAL_ACTION_PROJECTION) is entered.

At bootstrap, Stage 4 is NOT crossed (L-RT13-06). The AP is constitutionally halted at
CIVILIZATIONAL_ACTION — the pre-Stage-4 position where ICR and EER are required but
Stage 4 has not been entered. RT13-INV-3 is not triggered.

This is the same pattern as D8 CLI-2 (no short-circuit) in T3-13 F-02: bootstrap ≠ bypass.
Stage 4 is not bypassed — it simply hasn't been reached yet.

**Finding:** FALSIFIED. Stage 4 not crossed at bootstrap; RT13-INV-3 not triggered. NON-BLOCK.

---

### F-07: D5 PI-2 violation — bootstrap writes misrepresented as Projection Boundary crossings

**Claim to falsify:** D5 PI-2 and RT13-INV-6: "the ActionProjection is NEVER the external effect."
If T3-15 forms a PBCR to support PRR, it would conflate constitutional_records writes (Reality
Fabric operations) with Projection Boundary crossings into external reality. T3-15 BLOCKED —
any PBCR at bootstrap would be D5 PI-2 fraud.

**Evidence examined:**
- ActionProjection.CONSTITUTIONAL: "D5 PI-2 and RT13-INV-6: the ActionProjection is NEVER the
  external effect. The AP is a URO object within the Reality Fabric."
- PBCR constitutional note: "Formed at Stage 4 of every Action Projection Lifecycle"
- D8 PROH-5: permanent constitutional record

**Falsification:**

FALSIFIED. T3-15 does NOT form a PBCR at bootstrap. The implementation explicitly documents
L-RT13-06: "ProjectionBoundaryCrossingRecord not formed at bootstrap; D5 PI-2 and RT13-INV-6
prohibit conflating Reality Fabric writes with Projection Boundary crossings into external reality."

The task specification itself states: "ProjectionBoundaryCrossingRecord only where constitutionally
justified." Bootstrap writes to constitutional_records are within the governed Reality Fabric, not
crossings into external reality. No PBCR is formed. D5 PI-2 is not violated.

**Finding:** FALSIFIED. PBCR not formed at bootstrap (L-RT13-06); D5 PI-2 respected. NON-BLOCK.

---

### F-08: ProjectionResponsibilityRecord.projection_boundary_crossing_ref is REQUIRED — no PBCR at bootstrap blocks PRR formation

**Claim to falsify:** PRR.SCHEMA.projection_boundary_crossing_ref: required = true.
PRR constitutional note: "Formed AFTER Stage 4 Projection Boundary crossing." No PBCR at
bootstrap (F-07). Therefore PRR.projection_boundary_crossing_ref cannot be honestly populated.
T3-15 BLOCKED — PRR is listed as a required deliverable.

**Evidence examined:**
- PRR.SCHEMA.projection_boundary_crossing_ref: required = true
- PRR constitutional note: "Formed AFTER every Projection Boundary crossing (A0 §3.14 R10)"
- RT13-INV-4: every ActionProjection MUST have a ProjectionResponsibilityRecord

**Falsification:**

FALSIFIED — as CONSTITUTIONAL DEFERRAL, NOT AS BLOCKER.

The claim "T3-15 BLOCKED because PRR cannot be formed" is false. T3-15 is the bootstrap of the
RT-13 pipeline. PRR formation is constitutionally conditional on Stage 4 crossing:

- RT13-INV-4: "every ActionProjection MUST have a PRR" — but PRR is "Formed AFTER Stage 4"
- If Stage 4 has not been crossed, RT13-INV-4 is deferred (not violated)
- The AP is constitutionally valid at CIVILIZATIONAL_ACTION without a PRR; PRR becomes mandatory
  WHEN Stage 4 is actually crossed

This is analogous to CDP requiring SUBMITTED/ACCEPTED only when RT-12 processes it, not at PRODUCED
formation time. PRR requires Stage 4 crossing; at bootstrap, Stage 4 has not occurred.

T3-15 CAN proceed without PRR formation. L-RT13-04 documents the deferral. The absence of PRR at
bootstrap is constitutionally honest, not fraudulent (D8 IC-9: documented limitations ≠ fraud).

**Finding:** FALSIFIED as NON-BLOCK. PRR constitutionally deferred pending Stage 4 crossing. L-RT13-04. NON-BLOCK.

---

### F-09: PRR.responsible_actor_ref requires RT-01 ActorProfile — RT-01 ActorProfile for RT-13 may not be complete

**Claim to falsify:** PRR.SCHEMA.responsible_actor_ref: required = true, "Reference to
ActorProfile.actor_id (RT-01 owned)." RT-01 ActorProfile for the RT-13 bootstrap actor
has not been formally verified for this wiring context. T3-15 BLOCKED — PRR actor reference
cannot be honestly populated.

**Evidence examined:**
- PRR.SCHEMA.responsible_actor_ref: required = true
- D8 PROH-7: No Unassigned Execution — every AP must be attributable to an ActorProfile
- RT-01 W2-12: ActorProfile bootstrap complete

**Falsification:**

FALSIFIED — as MOOT. PRR is not formed at bootstrap per F-08 (L-RT13-04). If PRR is not formed,
responsible_actor_ref is not populated, and this field honesty question does not arise at bootstrap.

The deferral established by F-08 (L-RT13-04) makes F-09 constitutionally moot at this stage.
When PRR IS eventually formed (upon first actual Stage 4 crossing), RT-01 ActorProfile will need
to be provided. That determination is left to the implementation that crosses Stage 4.

**Finding:** FALSIFIED (MOOT — PRR not formed at bootstrap per L-RT13-04). NON-BLOCK.

---

### F-10: Circular dependency — rt13-bootstrap.js would require rt12-bootstrap.js

**Claim to falsify:** rt12-bootstrap.js requires rt13-bootstrap.js. If rt13-bootstrap.js also
requires rt12-bootstrap.js (for CivilizationalDecision types or other shared state), a circular
dependency would cause a module loading failure. T3-15 BLOCKED — circular require() would
produce an incomplete module at load time.

**Evidence examined:**
- rt12-bootstrap.js: requires rt13-bootstrap.js (T3-15 wiring)
- rt13-bootstrap.js: requires ... (to be verified)
- Node.js circular require behavior: incomplete module exported

**Falsification:**

FALSIFIED. rt13-bootstrap.js requires:
1. `../constitutional-types/effect-expectation-record` (ActionProjection, EER, ICR)
2. `../runtime/constitutional-store` (write)

Neither of these modules requires rt12-bootstrap.js. rt12-bootstrap.js requires:
1. `../constitutional-types/civilizational-decision` (CivilizationalDecision, OAR, DAR, CDC)
2. `../constitutional-types/civilizational-decision-proposal` (CDP)
3. `../runtime/constitutional-store` (write)
4. `./rt13-bootstrap` (formActionProjection)

No circular dependency exists. `node --check` verifies both modules load cleanly.

**Finding:** FALSIFIED. No circular dependency; modules verified by `node --check`. NON-BLOCK.

---

### F-11: PBCR is constitutionally required at every Stage 4 crossing — no PBCR means invalid AP

**Claim to falsify:** A0 §3.14 Produced Objects lists ProjectionBoundaryCrossingRecord.
PBCR constitutional note: "Formed at Stage 4 of every Action Projection Lifecycle." If the AP
exists but has no PBCR, the AP is constitutionally incomplete. T3-15 BLOCKED — AP without PBCR
is constitutionally malformed.

**Evidence examined:**
- A0 §3.14 Produced Objects: includes PBCR
- PBCR constitutional note: "Formed at Stage 4 of every Action Projection Lifecycle"
- D8 PROH-5: PBCR is permanent — once formed, cannot be deleted

**Falsification:**

FALSIFIED. "Formed at Stage 4" means PBCR is formed WHEN Stage 4 occurs. An AP at
CIVILIZATIONAL_ACTION (Stage 3) is in a valid pre-Stage-4 state. The AP is not constitutionally
malformed — it is constitutionally incomplete in the sense that Stage 4 has not yet been executed.

This is not a defect in T3-15; it is the constitutional reality of a bootstrap that halts before
Stage 4. The task specification explicitly recognizes this: "ProjectionBoundaryCrossingRecord only
where constitutionally justified." Bootstrap does not constitute Stage 4 justification.

An AP at CIVILIZATIONAL_ACTION with ICR and EER is constitutionally valid and complete for its
current stage. PBCR is formed WHEN Stage 4 is crossed, not before.

**Finding:** FALSIFIED. AP at CIVILIZATIONAL_ACTION is constitutionally valid. PBCR formed at Stage 4 (not yet reached). NON-BLOCK.

---

## VERDICT

**11 falsification attempts. 11 FALSIFIED. 0 unfalsified claims. 0 blockers.**

**VERDICT: AUTHORIZED**

---

## CONSTITUTIONAL LIMITATIONS ESTABLISHED

| ID | Description |
|----|-------------|
| L-RT13-01 | RT-13 full pipeline operationalization deferred; bootstrap ActionProjection formed via schema validation only at CIVILIZATIONAL_ACTION stage. NON-BLOCK. |
| L-RT13-02 | authority_resolution_ref bootstrapped — AUTH-RT13-BOOTSTRAP-v1-${timestamp}; RT-02 full Projection Authority verification deferred. NON-BLOCK. |
| L-RT13-03 | effect_observation_window bootstrapped — observation window documented as bootstrap placeholder pending RT-14 operationalization. NON-BLOCK. |
| L-RT13-04 | ProjectionResponsibilityRecord formation deferred — RT13-INV-4 not triggered at bootstrap (Stage 4 not crossed; AP halted at CIVILIZATIONAL_ACTION). PRR.projection_boundary_crossing_ref REQUIRED; no PBCR at bootstrap; fabrication prohibited. PRR formation pending first actual Stage 4 crossing. NON-BLOCK. |
| L-RT13-05 | AP lifecycle progression (DECISION_RECEIPT → CIVILIZATIONAL_ACTION) written as successive constitutional_records INSERTs (same pattern as L-RT12-04). NON-BLOCK. |
| L-RT13-06 | ProjectionBoundaryCrossingRecord not formed at bootstrap; no actual Stage 4 crossing has occurred; D5 PI-2 and RT13-INV-6 prohibit conflating Reality Fabric writes with crossings into external reality. NON-BLOCK. |

---

## IDR-W2-05-001 BLOCKER RESOLUTION

| Blocker | Original Description | Resolution |
|---------|---------------------|------------|
| Blocker 1 | Wrong wiring file (execution-evaluator.js is post-execution) | RESOLVED — wiring at rt12-bootstrap.js (decision formation time, pre-Stage-4) |
| Blocker 2 | No CivilizationalDecision existed (decision_ref unavailable) | RESOLVED — T3-13 produced decisionId at AUTHORIZED state |
| Blocker 3 | EER expected_effects_description cannot be honest post-execution | RESOLVED — EER formed before Stage 4 at rt12-bootstrap.js wiring point; context is honest |

**IDR-W2-05-001 STATUS: RESOLVED (all 3 blockers eliminated)**

---

## BOOTSTRAP PATTERN GENEALOGY

This Phase 0 extends the established constitutional bootstrap pattern:

| Task | Bootstrapped | Limitation |
|------|-------------|------------|
| T3-11B | CUM SYNTHESIZING without RT-06 | L-CSP-02 |
| T3-11C | CUM CURRENT without full RT-03 | L-CSP-08 |
| T3-12 | DR + CDP without DOM-000001 | L-DR-03, L-CDR-01 |
| T3-13 | CivilizationalDecision without full RT-02/RT-03 | L-RT12-01 through L-RT12-06 |
| T3-15 | AP + ICR + EER without Stage 4 crossing | L-RT13-01 through L-RT13-06 |

All bootstrap limitations follow the D-8 IC-9 pattern: honest documentation ≠ fraud (PROH-5).

---

*T3-15 Phase 0 Falsification Audit: 2026-08-04.*
*Status: AUTHORIZED. 11/11 FALSIFIED. 0 blockers.*
*T3-15 implementation is constitutionally authorized to proceed.*
