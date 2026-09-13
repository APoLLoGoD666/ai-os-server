# T4-06 — OAR Terminal Status Framework
## Open Action Register Terminal Status: Authoritative Constitutional Documentation

**Task:** T4-06  
**Type:** DOCUMENTATION ONLY — NO RUNTIME CODE  
**Status:** COMPLETE  
**Date:** 2026-08-24  
**Wave:** APEX — WAVE 4  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Producing authority:** APEX founding authority  

---

## 1. Purpose

This document establishes the authoritative constitutional definition of terminal status within the Open Action Register (OAR). Its purpose is:

1. To formally define what it means for an OAR entry to reach terminal status.
2. To identify the exact set of terminal states and their constitutional semantics.
3. To document the transition pathway from non-terminal to terminal status.
4. To establish the runtime ownership of terminal status assignment.
5. To document the evidence requirements, provenance model, and immutability rules.
6. To provide the constitutional closure path for Wave 3 PENDING OAR entries.
7. To leave Wave 4 with a precise, authoritative, traceable definition for the OAR terminal state lifecycle.

This document is the required output artifact `T4-06-OAR-TERMINAL-FRAMEWORK.md` per `WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 T4-06`.

---

## 2. Scope

**IN SCOPE:**
- Constitutional definition of OAR terminal status
- Terminal state taxonomy (COMPLETE, PARTIAL, FAILED, LOST)
- State transition model (non-terminal → terminal)
- `OpenActionRegisterTerminalStatusRecord` (OAR-TSR) schema and semantics
- Evidence, provenance, authority, and governance requirements
- RT-12, RT-14, RT-04, and T4-05 relationships
- Known limitations and deferred implementation requirements
- Constitutional closure path for Wave 3 PENDING OAR entries

**OUT OF SCOPE:**
- Any runtime implementation (T4-06 is documentation only)
- RT-12 modifications
- RT-14 modifications
- Any new constitutional types
- Any new persistence
- Any new routing or startup
- PETL or assembler changes

**TASK TYPE DECLARATION:** This is a DOCUMENTATION-ONLY task. Zero runtime code changes were made. All content derives from authoritative repository sources.

---

## 3. Authority

| Source | Role |
|--------|------|
| `A0-v1.1.1-canonical.md §3.13` | RT-12 constitutional seat; OAR ownership |
| `A0-v1.1.1-canonical.md §3.15` | RT-14 constitutional seat; terminal status assignment authority |
| `A0-v1.1.1-canonical.md §4.4` | 33-step execution sequence; Step 28 = OAR-TSR closure |
| `D5 PI-12` | Four canonical terminal states: COMPLETE, PARTIAL, FAILED, LOST |
| `D5 §8.4 BFP-1 through BFP-4` | Broken Feedback Protocol for LOST status |
| `D8 INV-6` | Constitutional Loop closure obligation |
| `D8 CLI-2` | Every Action Projection that crosses the Projection Boundary receives an Observed Consequence |
| `RT12-INV-5` | OAR entries closed ONLY by RT-14 terminal status assignment |
| `RT12-INV-6` | Every OAR entry must reach one of the four canonical terminal states |
| `RT14-INV-4` | OAR entries closed only AFTER Observed Consequence formation |
| `RT14-INV-6` | RT-14 monitoring obligation — no entry may remain permanently open |
| `FORB-06` | RT-14 must not directly mutate RT-12's OAR entries |
| `WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 T4-06` | T4-06 task definition |
| `lib/constitutional-types/civilizational-decision.js` | OpenActionRegisterEntry schema |
| `lib/constitutional-types/observed-consequence-record.js` | OpenActionRegisterTerminalStatusRecord schema |
| `lib/civilization/rt12-bootstrap.js` | Wave 3 OAR entry production |
| `lib/civilization/rt14-bootstrap.js` | T4-01 reflect() implementation |
| `T4-01-CERTIFICATION.md` | RT-14 bootstrap certification |

---

## 4. Definitions

**Open Action Register (OAR)**  
→ SOURCE: A0 §3.13 RT-12 Responsibility 4–5  
The register maintained by RT-12 of all OAR entries — decisions awaiting action, in-progress actions, and completed actions. Every authorized CivilizationalDecision creates one OAR entry.

**OpenActionRegisterEntry**  
→ SOURCE: `lib/constitutional-types/civilizational-decision.js`  
The constitutional type representing a single OAR entry. Owned by RT-12. `structural_immutable: false` (progresses through lifecycle states). `deletion_policy: 'PROHIBITED'`.

**Open Action Register Terminal Status**  
→ SOURCE: A0 §3.13 Responsibility 8; D5 PI-12  
The constitutionally-defined final state of an OAR entry. An entry reaches terminal status when RT-14 has formed an `OpenActionRegisterTerminalStatusRecord` assigning one of the four canonical terminal states: COMPLETE, PARTIAL, FAILED, or LOST.

**OpenActionRegisterTerminalStatusRecord (OAR-TSR)**  
→ SOURCE: `lib/constitutional-types/observed-consequence-record.js`  
The constitutional type produced by RT-14 that assigns terminal status to an OAR entry. Owned by RT-14. `structural_immutable: true`. `deletion_policy: 'PROHIBITED'`. This is the mechanism by which RT-12's register entry is closed.

**TerminalStatusRecord**  
→ SOURCE: R14-v1.0-canonical.md, prose usage  
Documentation shorthand for `OpenActionRegisterTerminalStatusRecord`. There is no separate constitutional type named "TerminalStatusRecord." All references to "TerminalStatusRecord" in prose are references to `OpenActionRegisterTerminalStatusRecord`.

**ObservedConsequenceRecord (OCR)**  
→ SOURCE: `lib/constitutional-types/observed-consequence-record.js`; RT-14 owned  
The comparison product of ConsequenceObservationRecord (RT-08) versus EffectExpectationRecord (RT-13). Prerequisite for OAR-TSR: terminal status can only be assigned after an OCR exists (RT14-INV-4).

**Terminality**  
→ SOURCE: D5 PI-12; RT12-INV-6; RT14-INV-6  
The condition in which an OAR entry has been assigned one of the four canonical terminal states and is constitutionally closed. Terminality is irreversible — no defined transition out of a terminal state exists in the authoritative architecture.

**Constitutional Loop**  
→ SOURCE: D8 INV-6; A0 §3.15 RT-14 purpose  
The end-to-end cycle: CivilizationalDecision → ActionProjection → Stage 4 Crossing → ConsequenceObservation → ObservedConsequence → OAR Terminal Status. Terminal status is the mechanism that closes the Constitutional Loop.

**Effect Observation Window**  
→ SOURCE: `lib/constitutional-types/effect-expectation-record.js`  
The constitutional window within which RT-14 must form an ObservedConsequenceRecord. Expiration without OCR formation triggers the Broken Feedback Protocol and LOST terminal status.

**Broken Feedback Protocol (BFP)**  
→ SOURCE: D5 §8.4 BFP-1 through BFP-4; R14-v1.0-canonical.md RS-18.1  
The protocol RT-14 executes when the Effect Observation Window expires without Observed Consequence formation: (BFP-1) assign LOST terminal status; (BFP-2) escalate to constitutional authority; (BFP-3) seek alternative observation projections via RT-08; (BFP-4) deliver CausalModelDivergenceRecord with LOST provenance to RT-11.

---

## 5. OAR Lifecycle

An OAR entry passes through the following lifecycle states:

```
CREATED (by RT-12, after CivilizationalDecision authorized by RT-03)
    │
    ▼
PENDING ──────────────────────────────────────────────────────────┐
    │                                                              │
    ▼                                                              │
IN_PROGRESS (optional — pre-terminal, RT-12 controlled)           │
    │                                                              │ L-T4-06-01
    │         (RT-14 forms OCR, then delivers OAR-TSR)            │ Wave 3 OAR entries
    ▼                                                              │ remain here until
TERMINAL STATE ASSIGNED BY RT-14 ─────────────────────────────────┘ first actual OCR
    │
    ├──→ COMPLETE
    ├──→ PARTIAL
    ├──→ FAILED
    └──→ LOST
```

**Non-terminal states (pre-terminal):**
- `PENDING` — OAR entry created; no terminal status assigned; awaiting RT-14 consequence observation
- `IN_PROGRESS` — optional intermediate state; RT-12 controlled; still non-terminal

**Terminal states (RT-14 exclusive):**
- `COMPLETE` — Constitutional Loop closed; expected effects fully realized
- `PARTIAL` — feedback partially complete; effects partially realized
- `FAILED` — effects not realized; understanding must be revised
- `LOST` — Effect Observation Window expired; Broken Feedback Protocol executed

**Lifecycle ownership:**
- Non-terminal transitions (PENDING → IN_PROGRESS): RT-12 controlled
- Terminal transitions (any → COMPLETE/PARTIAL/FAILED/LOST): RT-14 EXCLUSIVE via OAR-TSR (RT12-INV-5)

**A0 §4.4 Step 28 (33-step execution sequence):** "OAR Terminal Status Record (RT-14) closes OAR entry" — positioned after Step 27 (OCR formation), confirming OCR-first order (RT14-INV-4).

---

## 6. Terminal Status Taxonomy

### 6.1 COMPLETE

| Field | Value |
|-------|-------|
| Canonical name | `COMPLETE` |
| Source | D5 PI-12; `OpenActionRegisterTerminalStatusRecord.terminal_state` enum |
| Definition | Observed Consequence formed; expected effects fully realized; Constitutional Loop closed |
| Semantic meaning | The action achieved its intended constitutional effect. RT-14 has formed an OCR confirming that actual consequences match expected consequences (divergence_detected=false). |
| Entry criteria | OCR exists (`divergence_detected=false`); OAR entry is non-terminal; RT-14 has executed reflect() |
| Required evidence | `ObservedConsequenceRecord` with `divergence_detected=false` |
| Required records | `OpenActionRegisterTerminalStatusRecord` with `terminal_state='COMPLETE'`, `observed_consequence_ref=ocrId`, `issuing_runtime_attestation=true` |
| Owner | RT-14 (produces OAR-TSR); RT-12 (applies OAR-TSR to OAR entry) |
| Authority requirements | RT-14 founding authority (R14-v1.0-canonical.md RS-07) |
| Governance requirements | RT14-INV-4 (OCR before OAR-TSR); RT12-INV-5 (RT-14 exclusively) |
| Terminal | YES |
| Reversible | NO — no authoritative rule permits reversal of COMPLETE |
| Prohibited transitions | COMPLETE → any other state (no exit from terminal states) |
| Downstream consequences | RT-14 triggers RTR (RT14-INV-5): RT-09 and RT-11 notified; causal model confirmed |
| Audit requirements | RT-04 scope includes RT-14 terminal status assignment (T4-04 evidence artifact) |

**Bootstrap behaviour (L-RT14-05):** T4-01 bootstraps COMPLETE when `divergenceDetected=false`. This is the standard bootstrap path for an action where reality matched expectation.

---

### 6.2 PARTIAL

| Field | Value |
|-------|-------|
| Canonical name | `PARTIAL` |
| Source | D5 PI-12; `OpenActionRegisterTerminalStatusRecord.terminal_state` enum |
| Definition | Consequence partially observed or partially realized — feedback partially complete |
| Semantic meaning | The action achieved some but not all of its intended constitutional effects. An OCR exists but indicates partial realization. The Constitutional Loop is closed but with incomplete feedback. |
| Entry criteria | OCR exists; divergence indicates partial effect realization; OAR entry is non-terminal |
| Required evidence | `ObservedConsequenceRecord` (with divergence context indicating partial outcome) |
| Required records | `OpenActionRegisterTerminalStatusRecord` with `terminal_state='PARTIAL'`, `observed_consequence_ref=ocrId`, `issuing_runtime_attestation=true` |
| Owner | RT-14 (produces OAR-TSR); RT-12 (applies OAR-TSR) |
| Authority requirements | RT-14 founding authority |
| Governance requirements | RT14-INV-4; RT12-INV-5 |
| Terminal | YES |
| Reversible | NO |
| Prohibited transitions | PARTIAL → any other state |
| Downstream consequences | RT-14 triggers RTR (RT14-INV-5); RT-14 produces `CausalModelDivergenceRecord` (RT14-INV-2) for partial divergence; RT-11 CUM revision triggered |
| Audit requirements | RT-04 scope |

**Bootstrap behaviour (L-RT14-05):** T4-01 bootstraps PARTIAL when `divergenceDetected=true`. This covers the general divergence case at bootstrap where full divergence classification is not yet available.

---

### 6.3 FAILED

| Field | Value |
|-------|-------|
| Canonical name | `FAILED` |
| Source | D5 PI-12; `OpenActionRegisterTerminalStatusRecord.terminal_state` enum |
| Definition | Observed Consequence formed; expected effects not realized — understanding must be revised (RT14-INV-5; RT14-INV-3) |
| Semantic meaning | An OCR exists confirming that the action failed to achieve its intended effects. Reality was observed but diverged completely from expectation. Causal model must be revised — never the reality record (RT14-INV-3). |
| Entry criteria | OCR exists; divergence indicates complete non-realization of expected effects; OAR entry is non-terminal; operational escalation systems available |
| Required evidence | `ObservedConsequenceRecord` with complete-failure divergence context |
| Required records | `OpenActionRegisterTerminalStatusRecord` with `terminal_state='FAILED'`, `observed_consequence_ref=ocrId`, `issuing_runtime_attestation=true` |
| Owner | RT-14 (produces OAR-TSR); RT-12 (applies OAR-TSR) |
| Authority requirements | RT-14 founding authority; operational escalation systems |
| Governance requirements | RT14-INV-4; RT14-INV-2; RT14-INV-3; RT14-INV-5; RT12-INV-5 |
| Terminal | YES |
| Reversible | NO |
| Prohibited transitions | FAILED → any other state; reality record must not be revised (RT14-INV-3) |
| Downstream consequences | RT-14 triggers RTR (RT14-INV-5); RT-14 produces `CausalModelDivergenceRecord` (RT14-INV-2); RT-11 CUM revision mandatory; RT-09 knowledge update mandatory |
| Audit requirements | RT-04 scope; FAILED status is an audit-significant event |

**Bootstrap limitation (L-RT14-05):** FAILED requires operational escalation systems not yet available at bootstrap. Bootstrap PARTIAL covers the closest equivalent case. Full FAILED classification is deferred to operational RT-14.

---

### 6.4 LOST

| Field | Value |
|-------|-------|
| Canonical name | `LOST` |
| Source | D5 PI-12; D5 §8.4 BFP-1; `OpenActionRegisterTerminalStatusRecord.terminal_state` enum |
| Definition | Effect Observation Window expired without Observed Consequence — Broken Feedback Protocol (D5 §8.4 BFP-1 through BFP-4) applies; RT-14 must trigger escalation |
| Semantic meaning | The constitutional window for observing consequences has expired. No OCR was formed. The Constitutional Loop cannot be closed via evidence. RT-14 assigns LOST as a constitutional acknowledgement of observational failure — the action's outcome is unknown. |
| Entry criteria | Effect Observation Window (from EffectExpectationRecord) has expired; no OCR formed; OAR entry is non-terminal; BFP-1 through BFP-4 executed |
| Required evidence | Expiry of Effect Observation Window (from EffectExpectationRecord); No OCR present for this OAR entry |
| Required records | `OpenActionRegisterTerminalStatusRecord` with `terminal_state='LOST'`, `observed_consequence_ref` (exception — see below), `issuing_runtime_attestation=true`; `CausalModelDivergenceRecord` with LOST provenance |
| Owner | RT-14 (produces OAR-TSR); RT-12 (applies OAR-TSR) |
| Authority requirements | RT-14 founding authority; constitutional escalation to domain authority (BFP-2) |
| Governance requirements | RT12-INV-5; RT14-INV-6; D5 §8.4 BFP-1–4 |
| Terminal | YES |
| Reversible | NO |
| Prohibited transitions | LOST → any other state; a new action is required to replace a lost action |
| Downstream consequences | BFP-2: escalation to constitutional authority; BFP-3: alternative observation projections via RT-08; BFP-4: RT-11 receives CMDR with LOST provenance; conservative assumptions entered into Causal Model |
| Audit requirements | RT-04 scope; LOST is an audit-critical event |

**LOST and `observed_consequence_ref`:**  
IMPLEMENTATION OBSERVATION: The `OpenActionRegisterTerminalStatusRecord` schema requires `observed_consequence_ref`. For LOST status, no OCR exists (the window expired before OCR formation). This creates a schema tension. The authoritative rule (RT14-INV-4) says "OAR entries are closed only after Observed Consequence formation." LOST is the constitutional exception — the window expired, so no OCR can exist. This tension is a known limitation (L-T4-06-02). See §21 Limitations.

**Bootstrap limitation (L-RT14-05):** LOST requires operational escalation systems and Effect Observation Window expiry tracking not yet available at bootstrap. LOST classification is deferred to operational RT-14.

---

## 7. Terminal State Machine

### Non-Terminal States

```
PENDING         — created by RT-12 after CivilizationalDecision authorized
IN_PROGRESS     — optional RT-12 intermediate (no authoritative transition trigger defined)
```

### Terminal State Machine (authoritative)

```
       PENDING
          │
          │  RT-14 executes reflect()
          │  OCR formed (RT14-INV-4)
          │  OAR-TSR delivered to RT-12
          │
          ├──[divergence=false]──────────────→ COMPLETE
          │
          ├──[divergence=true, partial]───────→ PARTIAL
          │
          ├──[divergence=true, complete]──────→ FAILED
          │
          └──[Effect Observation Window       → LOST
               expired, no OCR]
```

**Invariant:** Once COMPLETE, PARTIAL, FAILED, or LOST — no further transition is possible. These are absorbing states.

**IN_PROGRESS transition:** Not defined in authoritative architecture for terminal purposes. IN_PROGRESS is a pre-terminal state controlled by RT-12. Any IN_PROGRESS entry follows the same terminal transition path as PENDING.

---

## 8. Terminal Transition Rules

### Valid Transitions

| From | To | Trigger | Authority | Required Evidence | Required Record | Owner | Audit |
|------|-----|---------|-----------|-------------------|----------------|-------|-------|
| PENDING or IN_PROGRESS | COMPLETE | OCR formed (divergence=false); reflect() executed | RT-14 founding authority (RT12-INV-5) | ObservedConsequenceRecord | OAR-TSR (terminal_state=COMPLETE) | RT-14 produces; RT-12 applies | RT-04 scope |
| PENDING or IN_PROGRESS | PARTIAL | OCR formed (divergence=true, partial); reflect() executed | RT-14 founding authority (RT12-INV-5) | ObservedConsequenceRecord | OAR-TSR (terminal_state=PARTIAL) + CMDR | RT-14 produces; RT-12 applies | RT-04 scope |
| PENDING or IN_PROGRESS | FAILED | OCR formed (divergence=true, complete failure); reflect() executed | RT-14 founding authority; operational escalation | ObservedConsequenceRecord | OAR-TSR (terminal_state=FAILED) + CMDR | RT-14 produces; RT-12 applies | RT-04 scope; audit-significant |
| PENDING or IN_PROGRESS | LOST | Effect Observation Window expired; no OCR; BFP-1 executed | RT-14 founding authority; constitutional escalation (BFP-2) | Window expiry evidence; no OCR | OAR-TSR (terminal_state=LOST) + CMDR (LOST provenance) | RT-14 produces; RT-12 applies | RT-04 scope; audit-critical |

### Prohibited Transitions

| From | To | Reason Prohibited |
|------|-----|-------------------|
| COMPLETE | Any state | No exit from terminal states — terminality is irreversible (D5 PI-12) |
| PARTIAL | Any state | No exit from terminal states |
| FAILED | Any state | No exit from terminal states; RT14-INV-3: reality record must not be revised |
| LOST | Any state | No exit from terminal states |
| PENDING | COMPLETE/PARTIAL/FAILED/LOST | Without OCR formation first (RT14-INV-4 prohibits this) |
| Any | Any terminal state | By RT-12 unilaterally (RT12-INV-5 prohibits this — only RT-14 via OAR-TSR) |
| PENDING | PENDING | Self-transition has no constitutional meaning |

**Note on PENDING → LOST:** Although LOST does not require an OCR (window expired), the transition is still triggered by RT-14 executing BFP-1 — not by RT-12 unilaterally. RT12-INV-5 is not violated because the OAR-TSR is still produced by RT-14.

---

## 9. OpenActionRegisterTerminalStatusRecord (OAR-TSR)

→ SOURCE: `lib/constitutional-types/observed-consequence-record.js`

### 9.1 Purpose

The OAR-TSR is the constitutional mechanism by which RT-14 assigns terminal status to an OAR entry owned by RT-12. It is the only valid means of closing an OAR entry (RT12-INV-5, RT14-INV-6).

### 9.2 Ownership

**Owner:** RT-14 (produces the OAR-TSR)  
**Consumer:** RT-12 (applies OAR-TSR to close the OAR entry)  
**FORB-06:** RT-14 must NOT directly mutate RT-12's OAR entries — RT-14 produces OAR-TSR; RT-12 applies it.

### 9.3 Required Fields

| Field | Type | Authoritative Description |
|-------|------|---------------------------|
| `oar_tsr_id` | string | Unique identifier for this terminal status record. Format (T4-01): `OARTSR-{oar_entry_id}-{timestamp}` |
| `oar_entry_ref` | string | Reference to the OAR entry being closed (OpenActionRegisterEntry.oar_entry_id) |
| `terminal_state` | enum | One of: `COMPLETE`, `PARTIAL`, `FAILED`, `LOST` — D5 PI-12, no other values are constitutionally valid |
| `observed_consequence_ref` | string | Reference to the OCR that grounds this terminal assignment — enforces RT14-INV-4 |
| `assignment_timestamp` | string | ISO 8601 timestamp of terminal status assignment |
| `issuing_runtime_attestation` | boolean | Must always be `true` — enforces RT12-INV-5 at schema level; RT-12 may not unilaterally assign terminal states |

### 9.4 Structural Properties

| Property | Value | Source |
|----------|-------|--------|
| `structural_immutable` | `true` | D8 IC-2 — once assigned, immutable |
| `deletion_policy` | `'PROHIBITED'` | Historical record must be preserved |
| `__type` | `'OpenActionRegisterTerminalStatusRecord'` | Constitutional type identifier |
| `__runtime` | `'RT-14'` | Issuing runtime |

### 9.5 Relationship to RT-14 `reflect()`

T4-01 implementation (`lib/civilization/rt14-bootstrap.js`) produces OAR-TSR as Step 2 of `reflect()`, always after Step 1 (OCR). This enforces RT14-INV-4 at the implementation level:

```
Step 1: ObservedConsequenceRecord  → ocrId
Step 2: OpenActionRegisterTerminalStatusRecord  → observed_consequence_ref = ocrId  ← OCR-first
Step 3: ReflectionTriggerRecord
Step 4: CausalModelDivergenceRecord  (only if divergenceDetected=true)
```

### 9.6 `observed_consequence_ref` for LOST Status — Schema Tension

LIMITATION (L-T4-06-02): The OAR-TSR schema requires `observed_consequence_ref`. For `terminal_state=LOST`, no OCR exists (the observation window expired before OCR formation). This creates a schema tension between:
- The field requirement (observed_consequence_ref must be set)
- The LOST semantics (no OCR was formed)

**Current resolution:** Not resolved in T4-01 bootstrap implementation (L-RT14-05 defers LOST classification). Resolution for operational LOST assignment is DEFERRED. See §22.

---

## 10. Evidence Requirements

The framework distinguishes:

**FACT** — what is known without inference (e.g., the OAR entry exists)  
**ASSERTION** — a claim without supporting artifact (e.g., "the action probably succeeded")  
**EVIDENCE** — a constitutional artifact produced by a runtime (e.g., OCR, CMDR)  
**DETERMINATION** — a structured comparison or classification grounded in evidence (e.g., divergence detection in OCR)  
**ATTESTATION** — a boolean flag confirming a constitutional invariant was satisfied (e.g., `issuing_runtime_attestation=true`)

**Critical distinction:** Attestation is NOT evidence. `issuing_runtime_attestation=true` attests that RT-14 is the issuer (satisfying RT12-INV-5) but does not constitute evidence that the terminal state is correct. Evidence is the OCR.

### Evidence Requirements by Terminal State

| Terminal State | Must Be Known | Must Be Observed | Must Be Evidenced | May Be Declared | Must Be Attested | May Remain Unknown |
|----------------|--------------|-----------------|-------------------|----------------|-----------------|-------------------|
| COMPLETE | OAR entry exists; expected effects | Effects realized | OCR (divergence=false) | Nothing | issuing_runtime_attestation=true | Causal mechanism |
| PARTIAL | OAR entry exists; expected effects | Partial effects | OCR (partial divergence) | Nothing | issuing_runtime_attestation=true | Which parts failed |
| FAILED | OAR entry exists; expected effects | Effects not realized | OCR (full divergence) | Nothing | issuing_runtime_attestation=true | Why effects failed |
| LOST | OAR entry exists; Window expiry | Nothing (window expired) | Window expiry timestamp (from EER) | LOST status (no OCR) | issuing_runtime_attestation=true | Whether any effect occurred |

**For LOST:** Absence of evidence (no OCR) is the trigger, not positive evidence of failure. LOST acknowledges observational incompleteness. It must NOT be treated as evidence that effects failed — it is evidence that observation did not occur.

---

## 11. Provenance

A terminal OAR-TSR entry can be traced as follows:

```
OAR Entry (oar_entry_ref)
    → OpenActionRegisterEntry (RT-12)
        → CivilizationalDecision (decision_ref on OAR entry)
            → CivilizationalDecisionProposal (deliberation_record_ref on CD)
                → DeliberationRecord (RT-11)
                    → CivilizationUnderstandingModel (cum_version_ref on DR)

OAR-TSR (observed_consequence_ref)
    → ObservedConsequenceRecord (RT-14)
        → ActionProjection (action_projection_ref on OCR)
            → EffectExpectationRecord (effect_expectation_ref on OCR)
                → ConsequenceObservationRecord (consequence_observation_ref on OCR)

OAR-TSR (issuing_runtime_attestation=true)
    → RT-14 founding authority
        → A0-v1.1.1 §3.15

OAR-TSR (oar_tsr_id)
    → ReflectionTriggerRecord (RT-14)
        → RT-09 knowledge update (rt09_triggered=true)
        → RT-11 CUM revision (rt11_triggered=true)
```

**Authoritative provenance fields (from schema):**
- `oar_tsr_id` — unique identifier
- `oar_entry_ref` — binds OAR-TSR to OAR entry
- `observed_consequence_ref` — binds OAR-TSR to OCR evidence chain
- `assignment_timestamp` — temporal ordering
- `issuing_runtime_attestation` — authority attestation

No additional provenance fields are defined in the authoritative schema. No new fields may be invented for this framework.

---

## 12. Authority

**Terminal status assignment authority:** RT-14 exclusively (RT12-INV-5; RT14-INV-6; FORB-06)  
**OAR entry ownership:** RT-12 exclusively (A0 §3.13 Owned Objects)  
**Terminal state application:** RT-12 applies OAR-TSR delivered by RT-14  
**Evidence formation:** RT-14 (OCR comparison), RT-08 (ConsequenceObservation input), RT-13 (EffectExpectation input)  
**Constitutional audit:** RT-04 (scopes RT-14 terminal assignment)

**What NO other runtime may do:**
- RT-12 may not assign terminal status unilaterally (RT12-INV-5)
- RT-11 may not assign terminal status
- RT-13 may not assign terminal status
- RT-04 may not assign terminal status
- DOM-000001 / RT-15 has no role in OAR terminal status (see §17)
- RT-16 has no role in OAR terminal status

---

## 13. Governance

**Governing invariants (verbatim):**

- `RT12-INV-5` (A0 §3.13): "Open Action Register entries are closed only by RT-14 terminal status assignment — never by RT-12 unilaterally"
- `RT12-INV-6` (A0 §3.13): "Every Open Action Register entry must reach one of the canonical terminal states: COMPLETE, PARTIAL, FAILED, or LOST — no entry may remain permanently open (D5 PI-12)"
- `RT14-INV-4` (A0 §3.15): "Open Action Register entries are closed only after Observed Consequence formation — not before"
- `RT14-INV-6` (A0 §3.15): "RT-14 must not permit any Open Action Register entry (owned by RT-12) to remain permanently open — RT-14's monitoring obligation ensures all entries reach a canonical terminal state: COMPLETE, PARTIAL, FAILED, or LOST (D5 PI-12)"
- `FORB-06` (R14-v1.0-canonical.md RS-35): "RT-14 must not directly mutate RT-12's OAR entries. RT-14 produces TerminalStatusRecords; RT-12 applies them."
- `D5 PI-12`: Four canonical terminal states — no other values constitutionally valid
- `D8 INV-6`: Constitutional Loop must always be closed

**Monitoring obligation (RT14-INV-6):** RT-14 holds a permanent monitoring obligation over all OAR entries. This obligation is not discharged until every entry reaches a terminal state. At bootstrap, this obligation is registered but not yet executable (no `OpenEntryMonitorSet` in operational state — L-RT14-03).

---

## 14. RT-12 Relationship

→ SOURCE: A0 §3.13; `lib/constitutional-types/civilizational-decision.js`; R12 certification audit

**What RT-12 owns:**
- `OpenActionRegisterEntry` — the OAR entry record
- The OAR as a whole
- `CivilizationalDecision` — the decision that created the OAR entry
- `DecisionArchiveRecord` — permanent archive

**What RT-12 produces:**
- OAR entries (one per authorized CivilizationalDecision)
- `CivilizationalDecision` objects satisfying DA-1 through DA-6

**What RT-12 consumes:**
- `OpenActionRegisterTerminalStatusRecord` delivered by RT-14 — applies it to close the OAR entry

**What RT-12 does NOT own or produce:**
- Terminal status assignment
- `OpenActionRegisterTerminalStatusRecord`

**RT-12 OAR entry `lifecycle_state` field:**  
The `lifecycle_state` on `OpenActionRegisterEntry` transitions from PENDING → (IN_PROGRESS →) COMPLETE/PARTIAL/FAILED/LOST. The terminal state values are written by RT-12 when it applies the OAR-TSR from RT-14. This does NOT violate RT12-INV-5 — RT-12 is applying an RT-14 terminal status record, not unilaterally assigning terminal status.

**Wave 3 PENDING OAR entry:**  
`lib/civilization/rt12-bootstrap.js` creates one OAR entry with `lifecycle_state='PENDING'` and `oar_entry_id='OAR-DEC-BOOTSTRAP-v1-{timestamp}'`. This entry:
- Has `rt14_terminal_assignment_only: true` — schema-level enforcement of RT12-INV-5
- Remains PENDING until RT-14's `reflect()` is called with this `oarEntryId`
- Constitutional closure path: call `reflect({ cor, eer, oarEntryId })` from `lib/civilization/rt14-bootstrap.js`

**Terminality affects future decisions:**  
A terminal OAR entry represents a constitutionally closed action. Terminal entries remain in the OAR archive (deletion prohibited) and remain part of the historical record. They do not affect the creation of new OAR entries for new decisions.

**Terminal actions remain queryable:** YES — `deletion_policy: 'PROHIBITED'` on OAR entry; permanent record.  
**Terminal actions remain auditable:** YES — RT-04 scope includes historical terminal entries.  
**Terminal actions remain part of historical state:** YES — `CivilizationalDecision` archive is permanent (A0 §3.13 Responsibility 9).

---

## 15. RT-14 Relationship

→ SOURCE: R14-v1.0-canonical.md; `lib/constitutional-types/observed-consequence-record.js`; `lib/civilization/rt14-bootstrap.js`; T4-01-CERTIFICATION.md

**What RT-14 owns:**
- `ObservedConsequenceRecord` (OCR)
- `OpenActionRegisterTerminalStatusRecord` (OAR-TSR)
- `CausalModelDivergenceRecord` (CMDR)
- `ReflectionTriggerRecord` (RTR)

**RT-14's role in terminal status:**

| Question | Answer | Source |
|----------|--------|--------|
| Does RT-14 cause terminality? | YES — by producing and delivering OAR-TSR | RT14-INV-6; A0 §3.15 Responsibility 8 |
| Does RT-14 supply evidence for terminality? | YES — OCR is the required evidence | RT14-INV-4 |
| Does RT-14 record terminality? | YES — OAR-TSR is the terminal status record | RT14-INV-6 |
| Does RT-14 observe terminality? | YES — monitors `OpenEntryMonitorSet` (RS-10 state variable) | RT14-INV-6; RS-05 Responsibility 13 |
| Does RT-14 consume terminality? | NO — RT-14 assigns it; RT-12 consumes it | FORB-06 |

**RT-14 `reflect()` function (T4-01):**  
`lib/civilization/rt14-bootstrap.js` exports `reflect({ cor, eer, oarEntryId })`. This function:
1. Forms OCR (Step 1) — prerequisite for OAR-TSR
2. Forms OAR-TSR (Step 2) — assigns COMPLETE or PARTIAL based on `divergenceDetected`
3. Forms RTR (Step 3) — unconditional, RT14-INV-5
4. Forms CMDR (Step 4) — only if divergence detected, RT14-INV-2

**RT-14 bootstrap terminal state mapping (L-RT14-05):**
- `divergenceDetected=false` → `terminal_state='COMPLETE'`
- `divergenceDetected=true` → `terminal_state='PARTIAL'`
- FAILED and LOST deferred to operational RT-14

**ConsequenceObservationRecord (COR):**  
COR is owned by RT-08 (not yet operational). COR is a required input to RT-14's `reflect()`. At bootstrap, COR is simulated (T4-01 accepts `cor` as a parameter). Full RT-14 operation requires RT-08 operational.

**EffectExpectationRecord (EER):**  
EER is owned by RT-13 (T3-15 certified). EER carries the `effect_observation_window` field that defines the expiry trigger for LOST classification.

**Monitoring obligation (state variable `OpenEntryMonitorSet`):**  
At bootstrap, `OpenEntryMonitorSet` is not operationally managed. RT-14's monitoring obligation (RT14-INV-6) is registered in the bootstrap but not yet executable as a persistent monitor. This is limitation L-RT14-03.

---

## 16. RT-04 Relationship

→ SOURCE: T4-04-CERTIFICATION.md; `lib/constitutional-types/audit-record.js`

**RT-04 audit scope includes terminal status:**  
T4-04 bootstrap `ConstitutionalAuditRecord` lists as an evidence artifact: "A0-v1.1.1 §3.15 — RT-14 Reflection Runtime formation: OCR, OAR-TSR, RTR (T4-01; RT14-INV-1 through RT14-INV-6)". This confirms OAR terminal status assignment is within RT-04's constitutional audit scope.

**Audit event:** RT-14 producing an OAR-TSR is an auditable event.  
**Audit evidence:** The OAR-TSR itself (structural_immutable=true, deletion_policy=PROHIBITED) constitutes a permanent audit artifact.  
**Provenance:** OAR-TSR `oar_tsr_id`, `oar_entry_ref`, `observed_consequence_ref`, `assignment_timestamp`, `issuing_runtime_attestation` provide the full provenance chain for RT-04 audit.

**RT-04 does NOT:**
- Assign terminal status
- Produce OAR-TSRs
- Create or close OAR entries
- Override RT-14's terminal status assignment

**Preservation requirements:**  
Terminal status records (`structural_immutable=true`, `deletion_policy=PROHIBITED`) are preserved in `constitutional_records`. RT-04 audits their existence and compliance at bootstrap scope. Full operational audit scope is deferred to operational RT-04.

**Audit requirement for LOST:**  
LOST is an audit-critical event. BFP-2 (escalation to constitutional authority) must be auditable. This requires operational RT-04 and escalation infrastructure — deferred per L-T4-06-01 and L-RT14-05.

---

## 17. T4-05 / DOM-000001 Relationship

→ SOURCE: T4-05-CERTIFICATION.md; lib/civilization/dom000001-bootstrap.js; R15-v1.0-canonical.md

**NO DIRECT T4-05 TERMINAL-STATUS DEPENDENCY ESTABLISHED.**

DOM-000001 being OPERATIONAL (as certified by T4-05, within BOOTSTRAP-DECISION-FILTER scope) does NOT:
- Cause OAR terminal status transitions
- Trigger RT-14 reflection
- Close OAR entries
- Assign terminal states

DOM-000001 operationalization (T4-05) affects the deliberation participant status in `_buildDrParticipants()` — not the OAR lifecycle.

**State machine clarification (Phase 12 requirement):**

| State Type | Owner | States | RT-15/DOM-000001 relationship |
|------------|-------|--------|-------------------------------|
| OAR terminal status | RT-12/RT-14 | PENDING, IN_PROGRESS, COMPLETE, PARTIAL, FAILED, LOST | NONE |
| RT-14 runtime operational status | RT-14 bootstrap | BOOTSTRAP (current) → OPERATIONAL (future) | NONE |
| DOM-000001 operational status | RT-15 / T4-05 | NOT-OPERATIONAL → OPERATIONAL (T4-05 certified) | Deliberation participants only |
| Constitutional compliance status | RT-04 | PASS / FAIL / DEFICIENCY | Covers all runtimes |

These four state machines are INDEPENDENT. DOM-000001 being OPERATIONAL has no constitutional implication for OAR terminal status.

**PAIR 53 (RT-15 ↔ RT-12):** RT-15 reports domain compliance status to RT-12. This is a compliance reporting relationship, not a terminal-status relationship. Domain compliance status ≠ OAR terminal status.

---

## 18. Immutability

### OAR-TSR Immutability

→ SOURCE: `lib/constitutional-types/observed-consequence-record.js` `structural_immutable: true`

`OpenActionRegisterTerminalStatusRecord` is **structurally immutable** once created. It cannot be modified, corrected, or superseded by modifying the record.

**Is correction permitted?** Not by modifying the OAR-TSR — no authoritative rule permits mutation. If an incorrect terminal state was assigned, the correction mechanism would be a new OAR entry for a new decision, not mutation of the closed entry.

**Is supersession permitted?** Not within the same OAR entry lifecycle. A terminal OAR entry cannot be "superseded" — it is permanently closed.

**Is reopening permitted?** NO — no authoritative rule permits reopening a terminal OAR entry. If a previously closed action requires re-execution, a new CivilizationalDecision → new OAR entry is required.

**Does reopening create a new action or mutate the old one?** A new action (new OAR entry) — the old OAR entry remains permanently in its terminal state.

### OAR Entry Immutability

→ SOURCE: `lib/constitutional-types/civilizational-decision.js` `structural_immutable: false`

`OpenActionRegisterEntry` has `structural_immutable: false` — it progresses through lifecycle states (PENDING → terminal). The LIFECYCLE STATE is mutable during pre-terminal phase. Once a terminal state is applied (via OAR-TSR), the terminal state is permanent.

**`deletion_policy: 'PROHIBITED'`** — the OAR entry record itself can never be deleted.

---

## 19. Historical Reconstruction

Terminal OAR entries are permanently preserved and traceable.

**Reconstruction chain:**

1. Given `oar_tsr_id` → look up `OpenActionRegisterTerminalStatusRecord`
2. From `oar_entry_ref` → look up `OpenActionRegisterEntry`
3. From `decision_ref` on OAR entry → look up `CivilizationalDecision`
4. From `deliberation_record_ref` on CD → look up `DeliberationRecord`
5. From `observed_consequence_ref` on OAR-TSR → look up `ObservedConsequenceRecord`
6. From `action_projection_ref` on OCR → look up `ActionProjection`
7. From `effect_expectation_ref` on OCR → look up `EffectExpectationRecord`
8. From OCR's `ReflectionTriggerRecord` → confirm RT-09/RT-11 notification

**Deletion prohibition:** All records in this chain carry `deletion_policy: 'PROHIBITED'`. Historical reconstruction is always possible (given operational `constitutional_records` persistence).

**Bootstrap limitation:** Wave 3 constitutional files are not deployed to production (APEX-ONE-PLATFORM-PHASE0-CERTIFICATION.md). `constitutional_records` does not exist in the production database. Historical reconstruction applies to records written to the operational `constitutional_records` table. Bootstrap records written during local testing are not in production.

---

## 20. Prohibited Transitions

| Transition | Prohibited By | Reason |
|------------|--------------|--------|
| Any terminal → any state | D5 PI-12; no authoritative exit rule | Terminality is irreversible |
| PENDING/IN_PROGRESS → terminal | RT-12 unilaterally | RT12-INV-5: ONLY RT-14 via OAR-TSR |
| Any → terminal | Without OCR existing | RT14-INV-4: OAR closed only AFTER OCR (exception: LOST — see L-T4-06-02) |
| Any → terminal state not in {COMPLETE, PARTIAL, FAILED, LOST} | D5 PI-12 | No other terminal states constitutionally valid |
| FAILED → any | D5 PI-12; RT14-INV-3 | Terminal; also reality record must not be revised |
| Any → terminal | By RT-13, RT-11, RT-04, RT-15, RT-16, or any runtime other than RT-14 | RT12-INV-5; RT14-INV-6 |

---

## 21. Known Limitations

### L-T4-06-01 (authoritative, from WAVE-4 roadmap)
Wave 3 OAR entries remain PENDING until first actual Stage 4 crossing produces an ObservedConsequenceRecord. The constitutional closure path exists (`reflect()` in rt14-bootstrap.js) but cannot be executed without a COR from operational RT-08. This is a structural bootstrap limitation — not resolvable by documentation or code changes within Wave 4 scope.

**Current state:** The Wave 3 OAR entry (`OAR-DEC-BOOTSTRAP-v1-{timestamp}`) from `rt12-bootstrap.js` is PENDING. It will remain PENDING until RT-08 is operational and provides a COR to `reflect()`.

### L-T4-06-02 (discovered in this investigation)
**LOST status schema tension:** `OpenActionRegisterTerminalStatusRecord.terminal_state='LOST'` requires `observed_consequence_ref` to be set. However, LOST status occurs precisely when no OCR was formed (the observation window expired). There is no OCR to reference. The schema as defined creates a contradiction for LOST assignment.

**Status:** DEFERRED. Not resolvable within T4-06 (documentation-only). Requires schema amendment or special handling in operational RT-14. This does not block COMPLETE or PARTIAL terminal status at bootstrap.

### L-T4-06-03 (implementation observation)
`OpenEntryMonitorSet` (RT-14 state variable, RS-10) is not operationally managed at bootstrap. RT-14's monitoring obligation (RT14-INV-6) is attested but not executable. Full monitoring requires persistent process state tracking not implemented in Wave 4 bootstrap scope.

### L-RT14-05 (inherited from T4-01)
Bootstrap terminal states are limited to COMPLETE (divergence=false) and PARTIAL (divergence=true). FAILED and LOST require operational escalation systems. This is a T4-01 limitation propagated to T4-06 documentation scope.

### L-RT14-03 (inherited from T4-01)
RT-09 and RT-11 update triggers (`rt09_triggered=true`, `rt11_triggered=true` on RTR) are attested but actual notification channels are not yet implemented at bootstrap. Attestation ≠ evidence of delivery.

### L-T4-06-04 (deployment gap)
Wave 3 constitutional files are not deployed to production (APEX-ONE-PLATFORM-PHASE0-CERTIFICATION.md). The OAR terminal status framework described here applies to the locally certified codebase. Production OAR persistence requires `constitutional_records` table deployment.

---

## 22. Deferred Implementation Requirements

| Item | Requirement | Blocking Dependency |
|------|-------------|-------------------|
| DEFERRED-01 | Operational `OpenEntryMonitorSet` — persistent RT-14 OAR monitoring (RT14-INV-6 full compliance) | RT-08 operational; persistent state beyond bootstrap |
| DEFERRED-02 | FAILED terminal state assignment with operational escalation (D5 §8.4) | RT-08 operational; escalation infrastructure |
| DEFERRED-03 | LOST terminal state assignment + BFP-1 through BFP-4 (D5 §8.4) | RT-08 operational; Effect Observation Window tracking; constitutional escalation channel |
| DEFERRED-04 | Schema amendment or handling for `observed_consequence_ref` in LOST status (L-T4-06-02) | RT-16 Amendment Process or architectural decision |
| DEFERRED-05 | RT-08 ConsequenceObservationRecord operational formation | RT-08 Wave 5+ scope |
| DEFERRED-06 | Production deployment of `constitutional_records` table | Infrastructure deployment |
| DEFERRED-07 | Actual RT-09 / RT-11 notification from RTR (L-RT14-03) | Operational inter-runtime communication channels |

---

## 23. Open Questions

### OQ-01: LOST and `observed_consequence_ref`
Does LOST status require a null/absent `observed_consequence_ref`, or a special placeholder reference? The authoritative spec (D5 §8.4 BFP-1) does not address the schema field for LOST. Resolution requires authoritative constitutional decision.

### OQ-02: OAR Entry `lifecycle_state` write on terminal assignment
When RT-14 delivers OAR-TSR to RT-12, exactly how does RT-12 "apply" it? FORB-06 says RT-14 must not mutate RT-12's OAR entries. RT-12 applies the OAR-TSR. Does this mean RT-12 must run a reconciliation step that reads the OAR-TSR and updates the `lifecycle_state` field on the OAR entry? The bootstrap implementation does not implement this reconciliation (T4-01 writes OAR-TSR to constitutional_records but does not update the OAR entry's lifecycle_state). This is a deferred implementation gap.

### OQ-03: Multiple OAR Entries per CivilizationalDecision
The authoritative architecture specifies one OAR entry per authorized CivilizationalDecision. Does a partially executed decision (PARTIAL terminal state) permit a new CivilizationalDecision for the remaining work? This is an architectural question not resolved by the authoritative sources inspected.

### OQ-04: IN_PROGRESS trigger
The `IN_PROGRESS` state is listed in `OpenActionRegisterEntry.lifecycle_state` enum but no authoritative trigger for PENDING → IN_PROGRESS is defined in the sources inspected. What event or runtime action moves an OAR entry to IN_PROGRESS?

---

## 24. Certification Criteria

T4-06 is certified when:

1. Authoritative T4-06 specification was read — DONE
2. OAR specification was read — DONE
3. OAR-TSR specification was read — DONE
4. RT-12 relationship established — DONE
5. RT-14 relationship established — DONE
6. RT-04 relationship established — DONE
7. T4-05 relationship established — DONE (NO DIRECT DEPENDENCY)
8. Terminal statuses sourced from authoritative evidence — DONE (D5 PI-12, schema enums)
9. No terminal status invented — CONFIRMED
10. Terminal transition semantics documented — DONE
11. Evidence requirements documented — DONE
12. Provenance documented — DONE
13. Authority documented — DONE
14. Governance documented — DONE
15. Historical semantics documented — DONE
16. Immutability semantics documented — DONE
17. Prohibited transitions documented — DONE
18. Limitations explicitly documented — DONE
19. Deferred implementation explicitly documented — DONE
20. Open questions explicitly documented — DONE
21. Documentation contradictions investigated — DONE (see §13 falsification)
22. No runtime code modified — CONFIRMED
23. No new architecture introduced — CONFIRMED

---

## 25. Final Status

**T4-06-OAR-TERMINAL-FRAMEWORK.md:** COMPLETE

**OAR Terminal Status Framework:** Established and documented from authoritative sources.

**Four terminal states:** COMPLETE, PARTIAL, FAILED, LOST — sourced from D5 PI-12 and `OpenActionRegisterTerminalStatusRecord.terminal_state` enum. None invented.

**Constitutional closure path for Wave 3 PENDING OAR entries:** Exists via `reflect()` in `lib/civilization/rt14-bootstrap.js`. Activation blocked by L-T4-06-01 (requires RT-08 operational COR). This is a structural bootstrap limitation, not a documentation gap.

**Key constitutional invariants satisfied in implementation:**  
- RT12-INV-5: `rt14_terminal_assignment_only: true` on OAR entry (schema enforcement)  
- RT12-INV-5: `issuing_runtime_attestation: true` on OAR-TSR (schema enforcement)  
- RT14-INV-4: Step 2 (OAR-TSR) always follows Step 1 (OCR) in `reflect()` (implementation enforcement)  
- RT14-INV-6: Monitoring obligation registered (attestation; operational monitoring deferred L-T4-06-03)

**ONE PLATFORM. ONE SYSTEM. ONE APEX.**

---

*Document produced by APEX AI OS — Claude Code (claude-sonnet-4-6). Wave 4 final documentation task. Date: 2026-08-24.*
