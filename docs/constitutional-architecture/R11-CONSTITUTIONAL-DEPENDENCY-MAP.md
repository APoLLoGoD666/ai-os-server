# RT-11 Constitutional Dependency Map
## Phase 0 Research Document — 2026-07-24

All dependency relationships involving RT-11. Every entry is derived from A0, A1, or PAIR records read directly from source. No relationship is inferred beyond what is stated in those documents.

---

## Part 1 — Inbound Dependencies (RT-11 receives from)

### 1.1 RT-10 → RT-11

| Field | Value |
|---|---|
| Source Runtime | RT-10 (Domain Understanding Runtime) |
| Destination Runtime | RT-11 (Civilization Intelligence Runtime) |
| Object Transferred | DomainUnderstandingModel (twelve instances); CUM synthesis input |
| Constitutional Basis | A0 §3.12 (Consumed Objects); A1 PAIR 32 |
| Dependency Type | Input; gate-blocking |
| Blocking Behavior | BLOCK — RT-11 must receive current CUM before deliberation; RT-11 cannot use stale CUM (A1 PAIR 32 P7) |
| PAIR | PAIR 32 |
| Direction | RT-10 → RT-11 (primary); RT-11 → RT-10 conditional (re-synthesis request) |
| Conflict / Ambiguity | PAIR 32 P4: "CUM (synthesized from 12 DUMs, provisionally owned by RT-10)" conflicts with A0 §3.12 listing CUM in RT-11's Owned Objects. A0 §3.12 governs. R10 v1.1 RS-12 confirms RT-11 is CUM owner. "Provisionally owned" is an undefined qualifier. |

**Detail:** RT-10 produces twelve Domain Understanding Models and initiates the nine-step Constitutional Synthesis Process (A1 §12.2 Step 8). The completed CUM is owned by RT-11 per A0 §3.12. RT-11 blocks deliberation on receipt of current CUM from RT-10. If RT-11 determines CUM is stale during deliberation, it requests re-synthesis from RT-10 (BLOCK — deliberation pauses until updated CUM delivered, A1 PAIR 32).

---

### 1.2 RT-06 → RT-11

| Field | Value |
|---|---|
| Source Runtime | RT-06 (Coherence Runtime) |
| Destination Runtime | RT-11 |
| Object Transferred | CUMCoherenceStatus; DomainCoherenceStatus (routed to RT-11 via RT-06 outputs) |
| Constitutional Basis | A0 §3.12 (Consumed Objects); A0 §4.1 Dependency Graph: "RT-06 → RT-11 (CUM coherence status)"; A0 §3.7 R13: "Report coherence status to RT-11 (CUM coherence)" |
| Dependency Type | Input; coherence gate |
| Blocking Behavior | NON-BLOCK — coherence status is a continuous monitoring signal, not a gate |
| PAIR | No numbered PAIR found for RT-06 ↔ RT-11 in the reviewed PAIR catalogue section |
| Direction | RT-06 → RT-11 (unidirectional for coherence status) |
| Conflict / Ambiguity | No conflict. RT-06 reports CUM coherence status to RT-11; RT-11 manages the CUM Degradation Protocol. Escalation path: RT-11 → RT-15 (DOM-000001 instance) via RT-06 escalation. |

**Detail:** RT-06 monitors all committed objects for GCR compliance. When domain coherence degrades, RT-06 flags CUM portions (per RT06-INV-3; A0 §3.7). RT-11 receives this status continuously and manages CUM Critical State per RT11-INV-5 (>4 domains degraded triggers DOM-000001 escalation).

---

### 1.3 RT-07 → RT-11

| Field | Value |
|---|---|
| Source Runtime | RT-07 (Memory Runtime) |
| Destination Runtime | RT-11 |
| Object Transferred | HistoricalStateQueryResult (containing historical CUMs and Deliberation Records) |
| Constitutional Basis | A0 §3.12 R13 (Responsibilities: "Retrieve historical CUMs and Deliberation Records from RT-07"); A1 PAIR 39 |
| Dependency Type | Input; conditional |
| Blocking Behavior | NON-BLOCK (A1 PAIR 39) |
| PAIR | PAIR 39 |
| Direction | RT-07 → RT-11 (conditional — when RT-11 requires historical deliberation state) |
| Conflict / Ambiguity | A1 PAIR 39 note: prior A1 v1.0 characterization was "Temporal anchoring for Decision Records" — corrected by A1-AMEND-002 to "HistoricalStateQueryResult — historical CUMs and Deliberation Records." Direction unchanged. No current conflict. |

**Detail:** RT-07 provides historical CUM versions and historical Deliberation Records on request from RT-11. This supports deliberation continuity — RT-11 can reference prior deliberation context without being blocked on retrieval.

---

### 1.4 RT-14 → RT-11 (Conditional)

| Field | Value |
|---|---|
| Source Runtime | RT-14 (Reality Feedback Runtime) |
| Destination Runtime | RT-11 |
| Object Transferred | CUM revision triggers; CausalModelDivergenceRecord; CUM Degradation notification (conditional direct path) |
| Constitutional Basis | A0 §3.12 R14 ("Receive RT-14 signals triggering CUM revision after consequence observation"); A1 PAIR 42; A0 §4.1: "RT-14 → RT-11 (CUM revision triggers, Causal Model Divergence Records)" |
| Dependency Type | Feedback; conditional input |
| Blocking Behavior | NON-BLOCK for standard feedback path (RT-14 → RT-09 → RT-10 → RT-11); CONDITIONAL BLOCK for direct CUM Degradation escalation path |
| PAIR | PAIR 42 |
| Direction | RT-14 → RT-11 (primary: through RT-09 pipeline; conditional direct: CUM Degradation only) |
| Conflict / Ambiguity | A1 PAIR 42: "The feedback path is: RT-14 → RT-09 → RT-10 → RT-11 (full pipeline re-entry). RT-14 does not directly address RT-11; it delivers to RT-09." But also: "Direct RT-14→RT-11 interaction: CONDITIONAL — RT-14 may escalate CUM Degradation notifications directly to RT-11 when >4 domains degraded." Two paths exist; the direct path is conditional on CUM Critical State threshold. |

**Detail:** Standard feedback loop delivers Consequence Observations through the full epistemic pipeline (RT-14 → RT-08 → RT-09 → RT-10 → RT-11). The direct RT-14 → RT-11 channel is reserved for CUM Critical State escalation (per D-7 §5.1).

---

### 1.5 RT-15 → RT-11

| Field | Value |
|---|---|
| Source Runtime | RT-15 (Domain Runtime, twelve instances) |
| Destination Runtime | RT-11 |
| Object Transferred | DomainUnderstandingModel (domain-level contribution) |
| Constitutional Basis | A0 §3.12 (Dependencies: "RT-15 (domain-level Understanding Models)"); A0 §4.1: "RT-15 → RT-11 (Domain Understanding Models)" |
| Dependency Type | Input |
| Blocking Behavior | Not specified as BLOCK for direct RT-15 → RT-11 path; primary path is RT-15 → RT-10 → RT-11 |
| PAIR | PAIR 52 (RT-15 ↔ RT-10, which then feeds RT-11); no separate numbered PAIR for RT-15 → RT-11 direct found in reviewed catalogue |
| Direction | RT-15 → RT-11 (through RT-10 synthesis) |
| Conflict / Ambiguity | RT-11 depends on RT-15 per A0 §3.12, but the primary channel is RT-15 → RT-10 → RT-11 (CUM synthesis requires all 12 DUMs from RT-15 via RT-10). A0 §4.1 information flow graph also shows "RT-15 → RT-11 (Domain Understanding Models)" as a direct path. Whether RT-11 receives directly from RT-15 in addition to via RT-10 is not fully specified in reviewed sources. |

---

### 1.6 RT-01 → RT-11 (Constitutional Infrastructure)

| Field | Value |
|---|---|
| Source Runtime | RT-01 (Identity Runtime) |
| Destination Runtime | RT-11 |
| Object Transferred | IdentityResolutionResult (identity validation for RT-11's actors and operations) |
| Constitutional Basis | A0 §4.1: "RT-01 Dependents: RT-11" (all runtimes depend on RT-01) |
| Dependency Type | Infrastructure; identity gate |
| Blocking Behavior | Implicit BLOCK — all Class A operations require RT-01 identity validation at Gate 1 |
| PAIR | No individual PAIR; universal dependency per A0 §4.1 |
| Direction | RT-01 → RT-11 (implicit for all operations) |
| Conflict / Ambiguity | None |

---

### 1.7 RT-03 → RT-11 (Kernel Mediation)

| Field | Value |
|---|---|
| Source Runtime | RT-03 (Constitutional Enforcement Kernel) |
| Destination Runtime | RT-11 |
| Object Transferred | CUM admission; Deliberation Record admission; gate processing results |
| Constitutional Basis | A0 §4.1: "RT-03 → RT-11 (CUM, Deliberation Records)" |
| Dependency Type | Infrastructure; gate |
| Blocking Behavior | BLOCK — RT-03 is a mandatory gate for all Class A operations |
| PAIR | No individual PAIR; universal infrastructure |
| Direction | RT-03 → RT-11 (admissions); RT-11 → RT-03 (all Class A submissions) |
| Conflict / Ambiguity | None |

---

## Part 2 — Outbound Dependencies (RT-11 delivers to)

### 2.1 RT-11 → RT-12

| Field | Value |
|---|---|
| Source Runtime | RT-11 |
| Destination Runtime | RT-12 (Decision Runtime) |
| Object Transferred | CivilizationalDecisionProposal; DeliberationRecord; CUM (context) |
| Constitutional Basis | A0 §3.12 (Dependents: "RT-12 (receives CivilizationalDecisionProposals and Deliberation Records)"); A0 §3.12 Runtime Outputs; A1 PAIR 40 |
| Dependency Type | Output; primary pipeline |
| Blocking Behavior | BLOCK — RT-12 cannot form CivilizationalDecision without RT-11 outputs; "No Action operation may be submitted to RT-03 without a constitutionally formed Decision (RT-11, requiring RT-09 + RT-10 deliberation)" (CC-6) |
| PAIR | PAIR 40 |
| Direction | RT-11 → RT-12 (primary); RT-12 → RT-11 (compliance failure return — re-deliberation trigger) |
| Conflict / Ambiguity | None. Well-defined in PAIR 40 and A0 §3.12. |

**Detail:** CivilizationalDecisionProposal from RT-11 is the constitutional input to RT-12's Decision formation. RT-12 does not form a Decision without a corresponding DeliberationRecord (RT12-INV-1). Compliance failure (PAIR 40 RT-12 → RT-11) triggers re-deliberation — RT-11 must re-deliberate; cycle is bounded.

---

### 2.2 RT-11 → RT-13 (Kernel-mediated)

| Field | Value |
|---|---|
| Source Runtime | RT-11 |
| Destination Runtime | RT-13 (Action Projection Runtime) |
| Object Transferred | CivilizationalDecision (via RT-03 → RT-12 → RT-13 chain) |
| Constitutional Basis | A1 PAIR 41 |
| Dependency Type | Output; Kernel-mediated |
| Blocking Behavior | RT-11 does not directly address RT-13; constitutional chain is RT-11 Decision → RT-03 admission → RT-13 execution |
| PAIR | PAIR 41 |
| Direction | RT-11 → RT-13 (Kernel-mediated; not direct) |
| Conflict / Ambiguity | FORBIDDEN initiation: RT-13 → RT-11 as initiation is constitutionally prohibited. "Action does not decide; Decision commands Action." |

---

### 2.3 RT-11 → RT-15 (Strategic Plan delivery)

| Field | Value |
|---|---|
| Source Runtime | RT-11 |
| Destination Runtime | RT-15 (Domain Runtime, all twelve instances) |
| Object Transferred | StrategicPlan (for domain alignment) |
| Constitutional Basis | A0 §3.12 Runtime Outputs: "StrategicPlan (to RT-12, to RT-15 for domain alignment)" |
| Dependency Type | Output; planning |
| Blocking Behavior | NON-BLOCK — StrategicPlan delivery does not block RT-15 operations |
| PAIR | PAIR 53 pattern (RT-15 ↔ RT-12 follows similar structure); no explicit numbered PAIR found for RT-11 → RT-15 in reviewed catalogue |
| Direction | RT-11 → RT-15 (StrategicPlan); RT-11 receives Domain Understanding Models from RT-15 (input side) |
| Conflict / Ambiguity | None specified |

---

### 2.4 RT-11 → RT-16 (Amendment trigger)

| Field | Value |
|---|---|
| Source Runtime | RT-11 |
| Destination Runtime | RT-16 (Amendment Runtime) |
| Object Transferred | Amendment Proposal (triggers RT-16 activation) |
| Constitutional Basis | A1 PAIR 59; A0 §3.12 (Dependents: "RT-16 (participates in amendment deliberation)"); D7 §6.1 |
| Dependency Type | Output; trigger |
| Blocking Behavior | RT-16 activation does not block RT-11 further; RT-11 has completed its deliberative obligation (PAIR 59) |
| PAIR | PAIR 59 |
| Direction | RT-11 → RT-16 (Amendment Proposal trigger); RT-16 → RT-11 (outcome return, non-blocking) |
| Conflict / Ambiguity | RT-11 is the ONLY runtime that may initiate an amendment process (PAIR 59). RT-16 self-initiation without RT-11 proposal is forbidden (A1 §14.3). |

---

### 2.5 RT-11 → RT-04 (Amendment-specific only)

| Field | Value |
|---|---|
| Source Runtime | RT-11 |
| Destination Runtime | RT-04 (Audit Runtime) |
| Object Transferred | Constitutional Preservation Audit request |
| Constitutional Basis | A1 PAIR 35; A0 §3.11, §3.16 (cited in PAIR 35) |
| Dependency Type | Output; conditional (amendment pathway only) |
| Blocking Behavior | BLOCK — RT-16 amendment process cannot proceed without RT-04 Preservation Audit |
| PAIR | PAIR 35 |
| Direction | RT-11 → RT-04 (amendment Preservation Audit request only); RT-04 → RT-11 (audit of all RT-11 operations, standard AIR-5) |
| Conflict / Ambiguity | RT-11 is the ONLY runtime that may constitutionally request RT-04 engagement in the amendment pathway (per PAIR 35 — "only for amendment pathway"). Standard RT-04 → RT-11 audit is the reverse direction (AIR-5 observes all). |

---

### 2.6 RT-11 → CUM Degradation Escalation Path

| Field | Value |
|---|---|
| Source Runtime | RT-11 |
| Destination Runtime | RT-15 (DOM-000001 instance) via RT-06 |
| Object Transferred | CUM Degradation escalation signal |
| Constitutional Basis | A0 §3.12 Runtime Outputs: "CUM degradation escalation (to RT-15 DOM-000001 instance via RT-06)"; RT11-INV-5 |
| Dependency Type | Output; mandatory escalation |
| Blocking Behavior | Mandatory — RT11-INV-5: "CUM Critical State (>4 domains degraded) triggers DOM-000001 escalation without exception" |
| PAIR | PAIR 42 (indirect; RT-14 → RT-11 for CUM degradation notifications); RT-06 routing |
| Direction | RT-11 → RT-06 → RT-15 (DOM-000001) |
| Conflict / Ambiguity | A0 §3.12 says escalation goes "to RT-15 DOM-000001 instance via RT-06." A0 §4.1 Information Flow Graph shows: "RT-11 → CUMDegradationEscalation → RT-15 (DOM-000001)." The routing through RT-06 is stated in A0 §3.12 Runtime Outputs but the A0 §4.1 graph shows direct RT-11 → RT-15 (DOM-000001). Minor routing ambiguity. |

---

## Part 3 — Summary Dependency Table

| Relationship | Source | Destination | Object | Basis | Type | Blocking |
|---|---|---|---|---|---|---|
| RT-10 → RT-11 | RT-10 | RT-11 | DomainUnderstandingModel (×12); CUM input | A0 §3.12; A1 PAIR 32 | Input | BLOCK |
| RT-06 → RT-11 | RT-06 | RT-11 | CUMCoherenceStatus; DomainCoherenceStatus | A0 §3.12; A0 §4.1 | Input/monitor | NON-BLOCK |
| RT-07 → RT-11 | RT-07 | RT-11 | HistoricalStateQueryResult (historical CUMs, DeliberationRecords) | A0 §3.12 R13; A1 PAIR 39 | Input/conditional | NON-BLOCK |
| RT-14 → RT-11 | RT-14 | RT-11 | CUM revision triggers; CausalModelDivergenceRecord | A0 §3.12 R14; A1 PAIR 42 | Feedback/conditional | NON-BLOCK (standard); CONDITIONAL (CUM Degradation direct) |
| RT-15 → RT-11 | RT-15 (×12) | RT-11 | DomainUnderstandingModel (domain contribution) | A0 §3.12; A0 §4.1 | Input | Via RT-10 synthesis |
| RT-01 → RT-11 | RT-01 | RT-11 | IdentityResolutionResult | A0 §4.1 | Infrastructure | Implicit BLOCK at Gate 1 |
| RT-03 → RT-11 | RT-03 | RT-11 | Admitted objects (CUM, DeliberationRecords) | A0 §4.1 | Infrastructure | BLOCK (Class A) |
| RT-11 → RT-12 | RT-11 | RT-12 | CivilizationalDecisionProposal; DeliberationRecord; CUM | A0 §3.12; A1 PAIR 40 | Output | BLOCK on RT-12 |
| RT-12 → RT-11 | RT-12 | RT-11 | Compliance failure re-deliberation trigger | A1 PAIR 40 | Loop-Restart | BLOCK |
| RT-11 → RT-13 | RT-11 | RT-13 | CivilizationalDecision (Kernel-mediated) | A1 PAIR 41 | Output | Via RT-03 |
| RT-11 → RT-15 | RT-11 | RT-15 | StrategicPlan | A0 §3.12 Runtime Outputs | Output | NON-BLOCK |
| RT-11 → RT-16 | RT-11 | RT-16 | Amendment Proposal | A1 PAIR 59 | Output/trigger | NON-BLOCK on RT-11 |
| RT-11 → RT-04 | RT-11 | RT-04 | Preservation Audit request (amendment only) | A1 PAIR 35 | Output/conditional | BLOCK on RT-16 |
| RT-11 → RT-15 (DOM-000001) | RT-11 | RT-15 (DOM-000001) | CUM Degradation escalation | A0 §3.12; RT11-INV-5 | Output/mandatory | Mandatory escalation |

---

## Part 4 — Dependency Type Classification

### 4.1 Gate Dependencies (blocking)

RT-11's outputs are gates for downstream runtimes:
- RT-12 CANNOT form CivilizationalDecision without RT-11 CivilizationalDecisionProposal and DeliberationRecord (CC-6, RT12-INV-1)
- RT-16 CANNOT activate without RT-11 deliberative trigger (A1 PAIR 59)
- RT-13 CANNOT execute Action Projection without a Decision tracing to RT-11 deliberation (CC-6)

RT-11's inputs are gates on RT-11:
- RT-10 DomainUnderstandingModel delivery BLOCKS RT-11 deliberation (stale CUM = void deliberation, A1 PAIR 32)

### 4.2 Loop Dependencies

RT-11 is on the critical path of the primary Constitutional Loop (A1 §15.2):
- Deliberation phase: PRIMARY (blocked by RT-10/RT-15 completing Understanding phase)
- Decision phase: PRIMARY (blocked by RT-12 compliance)
- Updated Understanding: SUPPORTING (receives RT-14 feedback via epistemic pipeline)

RT-11 participates in three authorized recursion cycles:
1. Constitutional Loop full cycle (D8; mandatory)
2. RT-11 ↔ RT-10 deliberation feedback (D7 §4.1; bounded — deliberation window bounded)
3. RT-12 → RT-11 compliance failure re-deliberation (D4 §3.3 Gate 5; bounded)

### 4.3 Forbidden Dependencies

From A1 §14.3:
- RT-13 → RT-11 as initiation: FORBIDDEN
- RT-11 → RT-14: FORBIDDEN ("Decision does not command feedback closure")
- RT-11 self-referential Decision as deliberation evidence: FORBIDDEN (FR-3)

---

## Part 5 — Conflicts and Ambiguities in Dependency Records

### 5.1 PAIR 32 P4 "Provisionally Owned" Conflict

**Documented at:** PAIR 32, A1 v1.2
**Nature:** States CUM "provisionally owned by RT-10" — conflicts with A0 §3.12 ownership assignment to RT-11
**Status:** Unresolved in A1. A0 §3.12 governs (higher authority). R10 v1.1 confirms RT-11 ownership.
**RS-12 disclosure required:** YES

### 5.2 A1 §6.1 Object Flow Table Creating Runtime

**Documented at:** A1 §6.1
**Nature:** Lists "Civilization Understanding Model | Creating Runtime: RT-10" — conflicts with A0 §3.12 ownership
**Status:** A0 §3.12 governs; A1 §6.1 describes production not ownership.
**RS-12 disclosure required:** YES

### 5.3 A1 §12.2 Step 8-9 CUM Synthesis Attribution

**Documented at:** A1 §12.2
**Nature:** "RT-10 initiates CUM synthesis" in Step 8 and "RT-10 submits updated DUM/CUM as Class A" in Step 9 — creates ambiguity about who executes the CSP
**Status:** R10 v1.1 RS-12 resolves: "formal synthesis authority belongs to RT-11." A1 §12.2 describes operational trigger sequence, not ownership.
**RS-12 disclosure required:** YES

### 5.4 CUM Degradation Escalation Routing Ambiguity

**Documented at:** A0 §3.12 Runtime Outputs vs A0 §4.1 Information Flow Graph
**Nature:** A0 §3.12 says "via RT-06"; A0 §4.1 graph shows RT-11 → RT-15 (DOM-000001) direct
**Status:** Minor routing ambiguity. Both sources agree RT-11 escalates to DOM-000001 instance. Routing detail unresolved.
**RS-12 disclosure required:** Recommended

---

*End of R11-CONSTITUTIONAL-DEPENDENCY-MAP.md*
*Phase 0 Research — 2026-07-24*
*All dependency relationships derived from A0, A1, and PAIR records read from source.*
