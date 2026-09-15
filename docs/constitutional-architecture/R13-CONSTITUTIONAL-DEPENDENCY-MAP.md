# R13 — CONSTITUTIONAL DEPENDENCY MAP
## Phase 0 Constitutional Baseline Analysis — Action Projection Runtime

**Document identifier:** R13-CONSTITUTIONAL-DEPENDENCY-MAP
**Status:** PHASE 0 RESEARCH — NOT A SPECIFICATION DRAFT
**Date:** 2026-07-24
**All maps derived from:** A0-v1.1.1-canonical.md §3.14, §4.1, §4.2, §4.3, §4.4; A1-v1.2-canonical.md §3.0, §5.1, §6.1, §15.2, §14.4, PAIRs 41/44/46/48/57; D6-v1.0-canonical.md §4.2–4.7
**Purpose:** Complete dependency, information, authority, loop, and failure propagation maps for RT-13. No content invented. All claims cite primary sources.

---

## MAP 1 — UPSTREAM RUNTIME MAP

### 1.1 RT-12 → RT-13

**Relationship:** RT-12 is a dependency of RT-13. Source: A0 §3.14 Dependencies.

**What is delivered:** Authorized CivilizationalDecision. Source: A0 §3.13 Outputs; A0 §4.1 "RT-12 (Decision) └─→ RT-13 (authorized CivilizationalDecisions)."

**Routing mechanism:** RT-12 forms the CivilizationalDecision → submits to RT-03 for six-gate processing (A0 §4.4 Step 20) → RT-05 admits via atomic commit (Step 21) → RT-12 creates Open Action Register entry (Step 22) → RT-13 initiates Action Projection Lifecycle (Step 23). The delivery path is RT-12 → RT-03 → RT-05 → RT-13. A1 §12.4 Step 2: "RT-03 delivers admitted Decision to RT-13."

**Ownership of delivered object:** CivilizationalDecision is owned by RT-12 throughout. RT-13 consumes but does not own it. Source: RT12-v1.0-canonical.md RS-07; A0 §3.13 Owned Objects.

**Blocking behavior:** BLOCKING for RT-13. RT-13 cannot initiate Action Projection without receiving an authorized CivilizationalDecision (RT13-INV-3 requires full six-gate Kernel processing precede Projection Boundary crossing). Source: A0 §3.14 RT13-INV-3.

**PAIR reference:** A0 §4.1 (dependency graph); A1 §12.4 Step 2.

### 1.2 RT-03 → RT-13

**Relationship:** RT-03 is a dependency of RT-13 (gate processing). Source: A0 §3.14 Dependencies.

**What is delivered:** Gate processing results; admitted Action payload delivery. Source: A1 PAIR 44: "After RT-03 admits an Action operation (Stages 8+9), RT-03 delivers the admitted Action payload to RT-13 for external projection."

**Direction:** Unidirectional: RT-03 → RT-13. Source: A1 PAIR 44: "Unidirectional (RT-03 delivers to RT-13)."

**Critical note:** "RT-13 does not submit to RT-03 (it receives from RT-03). RT-13 does not initiate Class A operations independently — it executes what RT-03 has admitted." Source: A1 PAIR 44.

**Correction note:** RT-13 DOES submit its own Action Projection record as Class A through RT-03 (A1 §12.4 Step 8: "RT-13 submits Action Projection record as Class A through RT-03"). PAIR 44 describes RT-03 delivering the admitted Decision to RT-13; the subsequent Action Projection submission is RT-13 → RT-03. Both directions of RT-03/RT-13 interaction exist but serve different purposes.

**A1 Permission Matrix (RT-13 row, RT-03 column):** "KRNL" — RT-13 → RT-03 is Kernel-mediated. Source: A1 §13.2.

### 1.3 RT-02 → RT-13

**Relationship:** RT-02 is a dependency of RT-13 (Projection Authority validation). Source: A0 §3.14 Dependencies.

**What is delivered:** AuthorityResolutionResult (Projection Authority). Source: A0 §3.14 Consumed Constitutional Objects; A0 §4.3 "Projection Authority (for each domain) → granted to actors; validated at RT-13."

**A0 §4.2 Information Flow:** "RT-02 ─[AuthorityResolutionResult]─→ RT-03, RT-04, RT-12, RT-13, RT-15." Source: A0 §4.2.

**Blocking behavior:** BLOCKING for RT-13. RT13-INV-3 mandates Projection Authority validation (RT-02) as a precondition for Projection Boundary crossing.

**A1 Permission Matrix (RT-13 row, RT-02 column):** "NONE" — this appears to conflict with A0 §3.14 Dependencies listing RT-02. However, the A1 §13.2 matrix shows RT-02 → RT-13 as part of Gate 3 processing (RT-03 Gate 3 mediates the authority check). The authority validation is mediated through RT-03 Gate 3. **Constitutional gap G-6 applies.** The matrix entry "NONE" for RT-13 → RT-02 indicates RT-13 does not directly query RT-02; the authority check is mediated through RT-03. This is consistent with PAIR 44 (RT-03 delivers to RT-13) — Gate 3 is where RT-02 validates Projection Authority.

### 1.4 RT-01 → RT-13

**Relationship:** RT-01 is a dependency of RT-13 (projection identity). Source: A0 §3.14 Dependencies.

**What is delivered:** Identity resolution / IdentityResolutionResult. Source: A0 §4.2: "RT-01 ─[IdentityResolutionResult]─→ RT-02, RT-03, RT-05, RT-08, RT-09, RT-12, RT-13, RT-15."

**Mechanism:** RT-01 identity is validated at RT-03 Gate 1 for every Class A RT-13 operation. A0 §3.14 R1 is satisfied because identity is confirmed before any Action Projection is formed.

**A1 characterization:** A1 Rule R2 characterizes RT-01 ↔ RT-13 as "NON-EXISTENT except through full Kernel-mediated chain." A0 §3.14 explicitly lists RT-01 as a dependency. A0 governs. The interaction is Kernel-mediated (Gate 1) but the dependency is real.

---

## MAP 2 — DOWNSTREAM RUNTIME MAP

### 2.1 RT-13 → External Reality

**Relationship:** RT-13 is the sole constitutional actor crossing from the governed Reality Fabric into external reality. Source: A0 §3.14 Constitutional Purpose.

**What is delivered:** Effects on external reality (Action Projection crossing the Projection Boundary). Source: A0 §3.14 R8; A0 §3.14 Runtime Outputs: "Projection Boundary crossings into external reality (effects on external reality)."

**Loop classification:** A1 §14.4: "RT-13 → External Reality (action emission closes the action phase)" — Loop-Ending interaction.

**Ownership of effect:** RT-13 assigns Projection Responsibility for all resulting effects (A0 §3.14 R10; RT13-INV-4). The effects themselves are in External Reality; the ProjectionResponsibilityRecord is owned by RT-13 in the Reality Fabric.

### 2.2 RT-13 → RT-14

**Relationship:** RT-14 is a Dependent of RT-13. Source: A0 §3.14 Dependents.

**What is delivered:** EffectExpectationRecords (for consequence comparison). Source: A0 §3.14 Dependents: "RT-14 (receives Effect Expectations for consequence comparison)"; A0 §3.14 Outputs: "EffectExpectationRecords (to RT-14 via RT-05 for comparison)."

**Routing:** Via RT-05 (not direct). Source: A0 §3.14 Outputs.

**PAIR 48 characterization:** "RT-13 → RT-14 (direct): FORBIDDEN. RT-13 executes; RT-14 observes independently." The delivery is mediated through RT-05.

**Consequence trigger chain:** RT-13 crosses Projection Boundary → External Reality produces consequences → RT-08 detects consequence signals (triggered by RT-13 trigger) → RT-14 receives Consequence Observation Records from RT-08. RT-13 → RT-14 is indirect through External Reality → RT-08.

### 2.3 RT-13 → RT-08

**Relationship:** RT-08 is a Dependent of RT-13. Source: A0 §3.14 Dependents.

**What is delivered:** Consequence observation triggers. Source: A0 §3.14 Dependents: "RT-08 (receives consequence observation triggers)"; A0 §3.14 Runtime Outputs: "Consequence signals to RT-08 (triggering ConsequenceObservationRecords)."

**Constitutional basis:** A0 §3.14 R12: "After crossing, register Observed Consequence signals with RT-08 for RT-14 to process." RT13-INV-5: "Consequence signals are always generated after Projection Boundary crossing — RT-08 is always notified to enable RT-14 consequence observation (D5 PI-6)."

**A0 §4.1:** "RT-13 (Action) └─→ [External Reality — effects] └─→ RT-14 (Effect Expectations for consequence comparison) └─→ RT-08 (consequence observation triggers)." Source: A0 §4.1.

### 2.4 RT-13 → RT-07

**Relationship:** RT-07 is a persistence recipient of RT-13 outputs (NOT listed as a Dependent in A0 §3.14 Dependents, but receives RT-13 outputs).

**What is delivered:** ProjectionBoundaryCrossingRecords. Source: A0 §3.14 Runtime Outputs: "ProjectionBoundaryCrossingRecords (to RT-07 for persistence)."

**Note:** RT-07 is not listed in A0 §3.14 Dependents. This output may flow through RT-03 → RT-05 → RT-07 rather than directly. RT-07 is a general persistence layer that receives from all runtimes via RT-03 mediation. The A0 §3.14 Outputs specification says "to RT-07 for persistence" — this is consistent with the RT-07 role as Memory Runtime.

---

## MAP 3 — OBJECT FLOWS WITH OWNERSHIP TRACKING

### 3.1 Inbound Object Flow

| Object | Owned By | From Runtime | Flow Path | A0 Source |
|--------|----------|-------------|-----------|-----------|
| Authorized CivilizationalDecision | RT-12 | RT-12 | RT-12 → RT-03 → RT-05 → RT-13 | A0 §3.14 Consumed Objects |
| AuthorityResolutionResult | RT-02 | RT-02 | RT-02 → RT-03 Gate 3 → (implicit in gate result) | A0 §3.14 Consumed Objects |
| Gate processing results | RT-03 | RT-03 | RT-03 → RT-13 (PAIR 44) | A0 §3.14 Consumed Objects |
| External reality state (post-execution) | External Reality | External Reality | Projection Boundary crossing → RT-13 receives consequence feedback | A0 §3.14 Runtime Inputs |

### 3.2 Outbound Object Flow

| Object | Owned By | To Runtime | Flow Path | A0 Source |
|--------|----------|-----------|-----------|-----------|
| ActionProjection | RT-13 | External Reality; RT-05 via RT-03 | RT-13 → RT-03 → RT-05; RT-13 → External Reality | A0 §3.14 Owned Objects; Outputs |
| EffectExpectationRecord | RT-13 | RT-14 | RT-13 → RT-05 (via RT-03) → RT-14 | A0 §3.14 Outputs |
| IrreversibilityClassificationRecord | RT-13 | (Persisted) | RT-13 → RT-03 → RT-05; RT-07 | A0 §3.14 Owned Objects |
| ProjectionResponsibilityRecord | RT-13 | (Persisted) | RT-13 → RT-03 → RT-05; RT-07 | A0 §3.14 Owned Objects |
| ProjectionBoundaryCrossingRecord | RT-13 | RT-07 | RT-13 → RT-07 (via RT-03) | A0 §3.14 Outputs |
| Consequence signals | RT-13 (trigger) | RT-08 | RT-13 → RT-08 (consequence observation trigger) | A0 §3.14 Outputs; R12 |
| Effects on External Reality | (No constitutional owner — external) | External Reality | RT-13 → External Reality crossing | A0 §3.14 Outputs |

### 3.3 A0 §4.2 Information Flow Graph — RT-13 Entries

From A0-v1.1.1-canonical.md §4.2 (exact text):

```
RT-12 ─[AuthorizedCivilizationalDecision]─→ RT-13
RT-13 ─[ActionProjection + EffectExpectation]─→ RT-03 ─→ RT-05
RT-13 ─[ProjectionBoundaryCrossing]─→ EXTERNAL REALITY
RT-13 ─[ConsequenceObservationTrigger]─→ RT-08
RT-13 ─[EffectExpectationRecord]─→ RT-14
```

---

## MAP 4 — AUTHORITY FLOWS

### 4.1 Authority Type Held by RT-13

RT-13 holds: AIR-4 (Projection Authority — Outbound domain). Source: A1 §5.1.

Definition: D6 §4.5: "the constitutional right to authorize and execute Action Projections in a domain's name — to cross the Projection Boundary and produce effects in the domain's ExternalRealitySegments."

### 4.2 Authority Validation Chain for RT-13 Operations

```
Human Governance Actors
  → Founding Authority Root (constitutional origin per D3 GI-5)
  → RT-02 (grants Projection Authority to actors)
  → Actors (hold Projection Authority per domain)
  → RT-13 (validates Projection Authority at Gate 3 via RT-03)
  → Projection Boundary crossing authorized
```

Source: A0 §4.3 Authority Relationship Graph: "Projection Authority (for each domain) → granted to actors; validated at RT-13."

### 4.3 Authority That Governs RT-13

RT-03 holds Constitutional Enforcement Authority over RT-13's operations (all Class A). Source: A0 §4.3.
RT-04 holds Constitutional Audit Authority over RT-13's operations (AIR-5, non-delegable). Source: A0 §4.3; A1 §5.1.

### 4.4 Authority RT-13 Validates (vs. RT-13's Own Authority)

RT-13 validates Projection Authority belonging to actors before allowing Projection Boundary crossings. This validation function is derived from RT-02's authority grants. RT-13 enforces the authority requirement; RT-02 grants the authority. RT-13 does not hold Decision Authority (AIR-3) — this was validated at RT-12.

---

## MAP 5 — INFORMATION FLOWS

### 5.1 Pre-Projection Information Required by RT-13

The following information must have been processed by upstream runtimes before RT-13 can execute:

| Information | Processing Runtime | Ultimate Source |
|-------------|-------------------|-----------------|
| Actor identity (who is projecting) | RT-01 (Identity) | Constitutional founding / actor registration |
| Projection Authority (is actor authorized?) | RT-02 (Authority) | Constitutional authority grants |
| Gate processing results (is operation constitutional?) | RT-03 (Kernel) | All six gates |
| CivilizationalDecision (what is to be projected?) | RT-12 (Decision) | RT-11 deliberation → RT-12 formation |
| DeliberationRecord grounding | RT-11 (via RT-12 input) | RT-11 deliberation process |
| CUM context | RT-11 (via RT-12 input) | RT-10 / RT-15 domain models |
| Epistemic chain validity | RT-09 (via Gate 4) | RT-08 observations |

RT-13 does not directly receive or process most of this upstream information — it arrives consolidated in the authorized CivilizationalDecision and gate processing results. RT-13 trusts RT-03's gate evaluation.

### 5.2 Post-Projection Information Produced by RT-13

| Information | Object Type | Recipient |
|-------------|-------------|-----------|
| External action execution results | Effects in External Reality | External Reality (no constitutional owner) |
| Projection record | ProjectionBoundaryCrossingRecord | RT-07 (persistence) |
| Effect Expectations (registered before crossing) | EffectExpectationRecord | RT-14 (via RT-05) |
| Consequence trigger | Consequence signal | RT-08 (triggers observation formation) |
| Responsibility assignment | ProjectionResponsibilityRecord | Persisted (RT-07 via RT-03) |
| Irreversibility classification | IrreversibilityClassificationRecord | Persisted (RT-07 via RT-03) |

---

## MAP 6 — KERNEL MEDIATION REQUIREMENTS

### 6.1 RT-13 Class A Operations

RT-13's Action Projection is a Class A operation. It must pass all six RT-03 gates before Projection Boundary crossing is permitted.

Source: A0 §3.14 R7 (verbatim): "Submit Action Projection to RT-03 for gate processing before Projection Boundary crossing."
Source: A0 §3.14 RT13-INV-3 (verbatim): "No Action Projection crosses the Projection Boundary without Projection Authority validation (RT-02) and full six-gate Kernel processing (RT-03)."
Source: A0 §4.5: "STEP 24: RT-03 processes Action Projection (Class A)."
Source: A1 §14.1: "All runtimes → RT-03 (Class A operations) | Any actor-originated operation | D-4 §2.1 (KMP)."

### 6.2 Gate-by-Gate Requirements for RT-13

| Gate | Content | RT-13 Implication |
|------|---------|-------------------|
| Gate 1 (VC-1) | RT-01 identity check | RT-13's identity (and the projecting actor's identity) must be resolved |
| Gate 2 (VC-2) | RT-05 object state | The ActionProjection object must exist and be in operable state |
| Gate 3 (VC-3) | RT-02 authority check | Projection Authority must be confirmed for the projecting actor in the target domain |
| Gate 4 (VC-4) | RT-09 epistemic chain | The epistemic chain underlying the CivilizationalDecision must be valid |
| Gate 5 (VC-5) | RT-12 constitutive coherence | The Action Projection must not create constitutively impossible constitutional states |
| Gate 6 (VC-6) | Temporal integrity | The Action Projection's timestamp must be causally consistent |

### 6.3 Stages 8+9 Commitment

After six-gate passage, RT-03 executes Stages 8+9 (atomic commit), admitting the ActionProjection into RT-05. Only after this admission does RT-13 cross the Projection Boundary (A0 §4.4 Step 25 follows Step 24 — RT-03 gate processing).

### 6.4 Cross-Domain Authorization

For multi-domain Action Projections, RT-13 must obtain cross-domain authorization records from RT-03 before projecting. Source: A0 §3.14 R14 (verbatim): "Obtain authorization from all affected domain authorities before projecting any Action that targets multiple domains; cross-domain Action Projection records must carry cross-domain authorization records issued by RT-03 (Constitutional Enforcement Kernel) (D5 PI-11)." RT13-INV-7.

---

## MAP 7 — FAILURE PROPAGATION ANALYSIS

### 7.1 Upstream Failure → RT-13 Impact

| Failed Runtime | RT-13 Impact | Severity |
|---------------|-------------|----------|
| RT-12 unavailable | RT-13 cannot receive authorized CivilizationalDecisions; Action Projection Lifecycle cannot initiate | BLOCKING — RT-13 halts |
| RT-03 unavailable | RT-13 cannot pass six-gate processing; Projection Boundary crossing constitutionally prohibited (RT13-INV-3) | BLOCKING — RT-13 halts |
| RT-02 unavailable | Projection Authority cannot be validated at Gate 3; RT-03 rejects Action Projection; RT-13 cannot cross | BLOCKING — RT-13 halts |
| RT-01 unavailable | Actor identity cannot be resolved at Gate 1; RT-03 rejects all operations | BLOCKING — RT-13 halts |
| RT-11 unavailable | No CivilizationalDecisionProposals reach RT-12; RT-12 cannot form CivilizationalDecisions; RT-13 receives nothing | BLOCKING (indirect) |
| RT-05 unavailable | RT-03 cannot commit admitted objects; constitutional admission fails | BLOCKING — all Class A operations fail |

### 7.2 RT-13 Failure → Downstream Impact

| RT-13 Failure Mode | Downstream Impact | Affected Runtime |
|-------------------|------------------|-----------------|
| RT-13 fails to cross Projection Boundary | External reality is not affected; action does not occur; Constitutional Loop not closed for this decision | External Reality (no effect); RT-14 cannot form Consequence Observation |
| RT-13 fails to send consequence signals | RT-08 is not triggered; RT-14 cannot form Consequence Observation Records; RT14-INV-1 violated (Constitutional Loop not closed); CLI-3 violation | RT-08, RT-14 |
| RT-13 fails to register Effect Expectations | RT-14 cannot compare consequences against expectations; divergence register cannot be populated; CausalModel revision may be incomplete | RT-14, RT-11 (downstream) |
| RT-13 fails to classify irreversibility | RT13-INV-1 violated; crossing is constitutionally prohibited; if crossing occurs anyway, violation is detected by RT-04 | RT-04 (audit), RT-03 (gate rejection) |
| RT-13 fails to submit Action Projection as Class A | RT-05 does not admit the ActionProjection; no provenance chain established; RT-04 detects broken chain | RT-05, RT-04, RT-07 |

### 7.3 Constitutional Loop Consequences

If RT-13 fails to execute:
- The CivilizationalDecision (RT-12 owned) remains authorized but unexecuted.
- The Open Action Register entry (RT-12 owned) remains open.
- RT-14 cannot assign terminal status (because no action was projected).
- The Constitutional Loop cannot complete its Action phase.
- CLI-3 (Feedback Completeness) is at risk: D5 PI-12 requires every Open Action Register entry to reach a terminal state (COMPLETE, PARTIAL, FAILED, or LOST). RT-14 must still assign a terminal state even if RT-13 failed — assigning FAILED or LOST.
- RT-04 detects the unclosed loop and reports to human governance actors.

---

## MAP 8 — LOOP PARTICIPATION MAP

### 8.1 RT-13 in the Constitutional Loop (D8)

From A1 §15.2 and A0 §4.4:

```
Constitutional Loop Phase Sequence:
Observation → Evidence → Knowledge → Understanding → Deliberation → Decision → [ACTION] → Consequence → Observation of Consequence → Updated Understanding

RT-13 PRIMARY: [ACTION] phase
RT-13 position in A0 §4.4 33-step sequence: Steps 23, 25
RT-13 position in A1 §12.4: Steps 3–8
```

### 8.2 Loop Classification per A1 §14.4

| RT-13 Interaction | A1 §14.4 Classification |
|------------------|------------------------|
| RT-13 → External Reality (action emission) | Loop-Ending: "action emission closes the action phase" |
| RT-13 receives admitted Decision from RT-03 | Loop-Continuing: "decision-to-action interactions (RT-11→RT-12→RT-03→RT-13)" |
| RT-13 → RT-08 (consequence trigger) | Loop-Continuing: advances to Consequence phase |

### 8.3 RT-13 Loop Integrity Obligations

RT-13 contributes to Constitutional Loop integrity through:
- **CLI-1 (No stage omission):** RT-13 must execute the complete Action Projection Lifecycle (seven stages per A0 §3.14 R3) — no stage may be skipped.
- **CLI-2 (No short-circuit):** RT-13 may not cross the Projection Boundary before six-gate RT-03 processing (RT13-INV-3).
- **CLI-3 (Feedback completeness):** RT-13 must trigger RT-08 consequence signals (RT13-INV-5) to enable RT-14 feedback loop closure. The mandatory RT-14 feedback closure per A1 §14.1 depends on RT-13's consequence signal.
- **CLI-4 (Temporal coherence):** RT-13's Action Projection must carry causally consistent timestamps (Gate 6).

Sources: A0 §4.7; A1 §15.3; D8 CLI-1 through CLI-4.

### 8.4 RT-13 is NOT Foundation Layer

Per A1 §15.2 Foundation Layer definition: RT-01, RT-02, RT-03, RT-04, RT-05, RT-06, RT-07 are the Foundation Layer present at every phase. RT-13 is NOT in the Foundation Layer. RT-13 participates only in the Action phase as PRIMARY. The specification author must not claim RT-13 has any role outside the Action phase in RS-31 or RS-29.

---

## MAP 9 — COMPLETE RUNTIME RELATIONSHIP TABLE

From A1 §13.2 Permission Matrix, RT-13 row and column, with constitutional basis:

| Other Runtime | RT-13 → Other | Other → RT-13 | Constitutional Basis | A1 PAIR |
|--------------|---------------|---------------|---------------------|---------|
| RT-01 | NONE (via Kernel only) | (dependency, Kernel-mediated) | A0 §3.14 Dependencies; A1 Rule R2 conflict; Gate 1 mediates | (Rule R2) |
| RT-02 | NONE | (Kernel-mediated Gate 3) | A0 §3.14 Dependencies; Projection Authority via Gate 3 | (Gate 3) |
| RT-03 | KRNL | DLVR | A0 §3.14 Dependencies; A1 PAIR 44 | PAIR 44 |
| RT-04 | NONE | ADIT | AIR-5; A0 §4.6 Audit Points | PAIR 46 |
| RT-05 | KRNL | (canonical state provider) | KMP D-4 §2.1 | Rule R4 |
| RT-06 | NONE | NONE | No constitutional overlap at RT-13 layer | Rule R2 |
| RT-07 | NONE | NONE (output recipient only) | RT-07 receives RT-13 outputs via RT-03 | (via RT-03) |
| RT-08 | (consequence trigger) | NONE | A0 §3.14 Dependents; Dependent not dependency | (A0 §3.14) |
| RT-09 | NONE | NONE | CC-5 forbidden; RT-09 does not project | A1 §14.3 |
| RT-10 | NONE | NONE | CC-5 forbidden | A1 §14.3 |
| RT-11 | NONE | (Kernel-mediated via RT-12) | CC-6: RT-13 → RT-11 FORBIDDEN; A1 §14.3 | PAIR 41 |
| RT-12 | NONE | (delivers CivilizationalDecision via RT-03) | A0 §3.14 Dependencies; dependency relationship | A0 §4.1 |
| RT-13 | SELF | SELF | — | — |
| RT-14 | NONE (FORBIDDEN direct) | (observes via External Reality consequences) | A1 PAIR 48; A0 §3.14 Dependents | PAIR 48 |
| RT-15 | (executes for RT-15 via RT-03) | NONE (direct) | A1 PAIR 57; RT-15 submits to RT-03, RT-13 executes | PAIR 57 |
| RT-16 | NONE | NONE | No constitutional overlap | Rule R2 |

---

*End of R13-CONSTITUTIONAL-DEPENDENCY-MAP.md*
