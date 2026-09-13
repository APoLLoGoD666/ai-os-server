---
document: R15-CONSTITUTIONAL-DEPENDENCY-MAP
title: RT-15 Constitutional Dependency Map
version: 1.0
status: RESEARCH — Phase 0 Baseline
date: 2026-07-24
prepared-for: RT-15 Specification Agent (R15-v1.0-canonical.md)
constitutional-sources: A0-v1.1.1-canonical.md §3.16, §4.1, §4.2, §4.3, §4.4; A1-v1.2-canonical.md §3.5 PAIR 51–58, §5.1, §13.2, §15.2
---

# R15-CONSTITUTIONAL-DEPENDENCY-MAP

## 1. Upstream Dependencies

### What RT-15 receives, from whom, and under what constitutional authority

| From | Object Received | Authority Basis | Blocking? | A1 PAIR | A0 Reference |
|------|----------------|-----------------|-----------|---------|--------------|
| RT-01 | IdentityResolutionResult; ActorProfile records | RT-01 provides identity resolution on demand (AIR-1 Identity domain) | NON-BLOCK | A1 Rule R1 (RT-04 pattern) — no distinct PAIR 51–58; governed by A0 §3.1 output list | A0 §3.1 Runtime Outputs; A0 §3.16 Consumed Objects |
| RT-02 | AuthorityResolutionResult; domain-specific authority maps | RT-02 maintains domain-specific authority maps used by all twelve domain instances (AIR-3 Authority domain) | NON-BLOCK | Governed by A0 §3.2; A1 §13.2 matrix (RT-02→RT-15: NONE — RT-15 queries RT-02 via RT-03) | A0 §3.2 Runtime Outputs; A0 §3.16 Consumed Objects |
| RT-03 | Gate processing for all Class A operations | Constitutional Enforcement Authority — gates all RT-15 Class A operations | BLOCK (Class A) | PAIR 55 (RT-15 submits Class A to RT-03; RT-03 does not initiate toward RT-15 outside gate processing) | A0 §3.3; A0 §3.16 Dependencies |
| RT-06 | DomainCoherenceStatus | RT-06 evaluates committed objects and reports coherence (Coherence Runtime function) | NON-BLOCK (signal) | A0 §4.2: RT-06 ─[DomainCoherenceStatus]─→ RT-15 | A0 §3.16 Responsibility 11; A0 §3.7 Runtime Outputs |
| RT-07 | HistoricalStateQueryResult; historical Domain Understanding Models | RT-07 provides historical state access on demand (Memory Runtime function) | NON-BLOCK (query) | A1 §13.2: RT-15 → RT-07 (QURY) | A0 §3.16 Dependencies; A0 §3.8 |
| RT-09 | DomainKnowledgeState (DKS-1 through DKS-4) | RT-09 coordinates with RT-15 for domain-scoped Knowledge States (AIR-2 Evidence domain) | NON-BLOCK (received when updated) | PAIR 51 (RT-09→RT-15 direction: epistemic queries; RT-09 delivers domain-scoped KnowledgeState via PAIR 51 RT-09-OUT-07) | A0 §3.16 Responsibilities 5, 11; A0 §3.10 Dependents |
| RT-10 | DomainUnderstandingModel (per domain) | RT-10 provides domain-level reasoning (AIR-2 Domain Understanding) | BLOCK (CUM synthesis waits for all 12 DUMs; RT-10→RT-15 query direction) | PAIR 52 (RT-10→RT-15 direction: DUM update query; BLOCK — CUM synthesis waits for all 12 DUMs) | A0 §3.16 Responsibilities 6, 10; A0 §3.11 Dependents |
| RT-14 | DomainUpdateTrigger | RT-14 triggers domain Understanding Model updates as part of Reflection runtime feedback (Responsibility 7 of RT-14) | NON-BLOCK (trigger) | A0 §4.2: RT-14 ─[DomainUpdateTrigger]─→ RT-15; A0 §4.4 STEP 30 | A0 §3.16 Responsibility 12; A0 §3.15 Responsibility 7 |

**RT-11 → RT-15 (conditional, DOM-000001 only):**
| From | Object Received | Authority Basis | Blocking? | Reference |
|------|----------------|-----------------|-----------|-----------|
| RT-11 | CUMDegradationEscalation | RT-11 escalates to RT-15 DOM-000001 when >4 domains degraded (D7 §5.1, CUM Critical State) | NON-BLOCK (escalation signal) | A0 §4.2: RT-11 ─[CUMDegradationEscalation]─→ RT-15 (DOM-000001); RT15-INV-6 mandates response |

---

## 2. Downstream Dependents

### What RT-15 produces, to whom, and what objects are provided

| To | Object Produced | Authority Basis | Blocking? | A1 PAIR | A0 Reference |
|----|----------------|-----------------|-----------|---------|--------------|
| RT-11 | DomainUnderstandingModel (per instance) | RT-15 holds AIR-1, AIR-2, AIR-3 (domain-specific); DUM is the primary epistemic output of the domain | BLOCK — CUM synthesis in RT-11 waits for all 12 DUMs | PAIR 52 (RT-15→RT-10 direction provides DUM; RT-10 synthesizes for RT-11) | A0 §3.16 Responsibility 10; A0 §4.1 "RT-15→RT-11 (Domain Understanding Models)" |
| RT-09 | Domain-specific Evidence Records | RT-15 holds AIR-1 (Observation Authority) domain-specific | Class A — Kernel-mediated | PAIR 51 (RT-15→RT-09: Domain-specific Evidence Records) | A0 §3.16 Responsibility 5 coordination |
| RT-10 | Domain Understanding contribution | RT-15 coordinates domain-level understanding requirements | Delivered on query (PAIR 52 RT-15→RT-10) | PAIR 52 (RT-15→RT-10: Domain Understanding contribution; each RT-15 instance produces DUM for RT-10) | A0 §3.11: RT-15 (Understanding requirements input) |
| RT-12 | Domain compliance status | Domain Runtime reports domain compliance status; RT-12 integrates for civilizational compliance picture | NON-BLOCK | PAIR 53 (RT-15→RT-12: domain compliance status) | A0 §4.2 not explicitly listed — derived from A1 PAIR 53 (D-6) |
| RT-04 | DomainFailureModeRecord (for audit) | RT-04 audits all 12 RT-15 instances (AIR-5) | NON-BLOCK | PAIR 56 (RT-04 audits RT-15; RT-15 provides records to RT-04) | A0 §3.16 Responsibility 8; RT15-INV-4 |
| RT-16 | Domain deliberation participation | RT-15 coordinates with RT-16 for domain deliberation in constitutional amendments | NON-BLOCK | A0 §4.1: RT-15→RT-16 (domain deliberation participation in amendments) | A0 §3.16 Responsibility 13 |
| RT-05 | All Class A objects (via RT-03) | All domain operations that mutate reality are Class A | BLOCK (Class A requires RT-03 admission first) | PAIR 54 (RT-15 mutations Kernel-mediated through RT-03 to RT-05; RT-15 reads RT-05 directly) | A0 §3.3; A0 §3.16 Dependencies |
| RT-15[j] | Cross-domain authority requests (from RT-15[i]) | Cross-domain relationships governed by D-6 §4.1; AIR-1/2/3 domain-specific authority | COND: Class A for mutations; Class B for reads | PAIR 58 (RT-15[i]→RT-15[j]: Cross-domain authority request; Kernel-mediated for mutations) | A0 §3.16 Responsibility 9; RT15-INV-5 |

---

## 3. Object Flow Diagram (Textual)

```
UPSTREAM (what flows INTO RT-15)
────────────────────────────────
RT-01 ──[IdentityResolutionResult, ActorProfile]──────────────────→ RT-15
RT-02 ──[AuthorityResolutionResult, domain authority maps]─────────→ RT-15
RT-03 ──[Gate processing, admitted operations]────────────────────→ RT-15
RT-06 ──[DomainCoherenceStatus]───────────────────────────────────→ RT-15
RT-07 ──[HistoricalStateQueryResult]──────────────────────────────→ RT-15
RT-09 ──[DomainKnowledgeState]────────────────────────────────────→ RT-15
RT-10 ──[DomainUnderstandingModel (per domain)]───────────────────→ RT-15
RT-14 ──[DomainUpdateTrigger]─────────────────────────────────────→ RT-15
RT-11 ──[CUMDegradationEscalation]──────────[DOM-000001 only]────→ RT-15

INTERNAL (RT-15 archetype operations)
───────────────────────────────────────
RT-15 maintains: DomainProfile, DomainAuthorityRecord, DomainActorProfileRegistry,
                 DomainKnowledgeChain, DomainCoherenceAssessment,
                 DomainFailureModeRecord, CrossDomainRelationshipRecord

RT-15[i] ↔ RT-15[j]: Cross-domain requests (PEER; Class A via RT-03 for mutations)

DOWNSTREAM (what flows OUT OF RT-15)
──────────────────────────────────────
RT-15 ──[DomainUnderstandingModel]────────────────────────────────→ RT-11
RT-15 ──[Domain-specific Evidence Records (Class A)]───→ RT-03 ──→ RT-09
RT-15 ──[Domain Understanding contribution]───────────────────────→ RT-10
RT-15 ──[Domain compliance status]────────────────────────────────→ RT-12
RT-15 ──[DomainFailureModeRecord]─────────────────────────────────→ RT-04
RT-15 ──[Domain deliberation participation]───────────────────────→ RT-16
RT-15 ──[All Class A operations]──────────→ RT-03 ──→ RT-05 (admitted)

AUTHORITY FLOW THROUGH RT-15
──────────────────────────────
Human Governance Actors
  → Founding Authority Root
    → RT-02 (grants/holds all five authority types)
      → actors in RT-15 domain registries (AIR-1, AIR-2, AIR-3, AIR-4 per domain)
        [AIR-5 flows independently: RT-04 holds Audit Authority over all 12 RT-15 instances]
```

---

## 4. Interaction Boundaries

### 4.1 RT-15 / RT-14 Boundary (Upstream Trigger)

**RT-14 scope:** RT-14 (Reflection Runtime) forms ObservedConsequenceRecords, triggers Understanding updates throughout the epistemic chain (RT-09, RT-11), and issues DomainUpdateTriggers to RT-15. RT-14's scope in relation to RT-15 ends with trigger delivery.

**RT-15 scope:** RT-15 receives DomainUpdateTriggers from RT-14 (Responsibility 12) and executes domain-level consequence integration. RT-15 does not initiate toward RT-14.

**Boundary object:** DomainUpdateTrigger — produced by RT-14 (owned by RT-14 per A0 §3.15 Produced Constitutional Objects: "domain update triggers"), received by RT-15.

**Prohibited:** RT-15 does not direct RT-14 in any manner. RT-15 does not form ConsequenceObservationRecords (RT-08 function) or ObservedConsequenceRecords (RT-14 function).

**Ground:** A0 §3.15 Responsibility 7; A0 §3.16 Responsibility 12; A0 §4.2 Information Flow Graph; R14-v1.0-canonical.md RS-04.3, RS-27 ("RT-15 (receives domain update triggers)").

### 4.2 RT-15 / RT-11 Boundary (Downstream Output)

**RT-15 scope:** Each RT-15 instance produces a DomainUnderstandingModel (DUM) — the primary epistemic contribution of the domain to civilizational intelligence. RT-15 is the creator of domain-specific DUMs. RT-11 synthesis of the CUM cannot begin until all 12 DUMs are current (BLOCK condition on PAIR 52).

**RT-11 scope:** RT-11 (Civilization Intelligence Runtime) synthesizes DUMs from all twelve RT-15 instances into the Civilization Understanding Model (CUM). RT-11 does not produce domain-level DUMs — those are RT-15-owned objects.

**Boundary object:** DomainUnderstandingModel — produced by RT-15 (owned by RT-15 per A0 §3.16 Produced Constitutional Objects), received by RT-11 for CUM synthesis. Note: A1 §6.1 lists DomainUnderstandingModel creating runtimes as "RT-10, RT-15" — both co-produce DUMs (RT-10 provides the intelligence layer; RT-15 provides the domain-specific layer).

**Blocking:** CUM synthesis BLOCKS on receipt of all 12 DUMs.

**Ground:** A0 §3.16 Responsibility 10; A0 §3.12 Dependencies ("RT-15 (domain-level Understanding Models)"); A1 PAIR 52; R11-v1.3-canonical.md RS-26.

### 4.3 RT-15 / RT-09 Boundary (Domain Knowledge Interface)

**RT-09 scope:** RT-09 (Knowledge Runtime) coordinates with all twelve RT-15 domain instances for domain-scoped Knowledge States. RT-09 delivers DomainKnowledgeState to RT-15 and receives Domain-specific Evidence Records from RT-15.

**RT-15 scope:** RT-15 coordinates with RT-09 for domain-scoped Knowledge States (Responsibility 5). RT-15 delivers Domain-specific Evidence Records to RT-09 (Class A, Kernel-mediated per PAIR 51).

**Boundary:** PAIR 51 (bidirectional). RT-15→RT-09: Evidence Records (Class A). RT-09→RT-15: epistemic queries for domain-specific evidence.

**Ground:** A0 §3.16 Responsibility 5; A0 §3.10 Dependents ("RT-15 (domain-scoped Knowledge States)"); A1 PAIR 51; R9-v1.0-canonical.md RS-27.

### 4.4 RT-15 / RT-10 Boundary (Domain Intelligence Interface)

**RT-10 scope:** RT-10 coordinates with RT-15 on domain-level understanding requirements and queries RT-15 instances for DUM updates. RT-10 delivers DomainUnderstandingModels to RT-15 (per A0 §3.11 Runtime Outputs). The BLOCK condition: CUM synthesis cannot begin without all 12 DUMs.

**RT-15 scope:** RT-15 provides domain Understanding contribution to RT-10 (PAIR 52 RT-15→RT-10 direction) and coordinates with RT-10 for domain-level reasoning (Responsibility 6).

**Ground:** A0 §3.16 Responsibilities 6, 10; A0 §3.11 Dependents ("RT-15 (receives domain-level understanding)"); A1 PAIR 52; R10-v1.1-canonical.md RS-27, RS-32.

### 4.5 RT-15 / RT-12 Boundary (Compliance Interface)

**RT-12 scope:** RT-12 issues domain compliance determinations to relevant RT-15 instances (PAIR 53 RT-12→RT-15 direction).

**RT-15 scope:** RT-15 reports domain compliance status to RT-12 (PAIR 53 RT-15→RT-12 direction).

**Note:** This interaction (PAIR 53) is derived from D-6 per A1 derivation method M2, but RT-12 does not appear in A0 §3.16 Dependencies or Dependents. See Conflicts Register C-4 in R15-SPECIFICATION-BASELINE.md.

**Ground:** A1 PAIR 53; D-6 domain governance.

### 4.6 RT-15 / RT-03 Boundary (Kernel Mediation)

**RT-03 scope:** RT-03 gates all Class A operations from RT-15. RT-03 does not initiate toward RT-15 outside gate processing.

**RT-15 scope:** All RT-15 Class A operations submit to RT-03 (PAIR 55). RT-15 may not bypass RT-03 for fabric admissions (D4 KMP; A0 §3.16 Dependencies). RT-15 may read RT-05 directly (read path does not require Class A gating).

**Ground:** A1 PAIR 55; D4 §2.1 KMP; A0 §3.16 Dependencies; A1 §14.3 Forbidden Interactions ("RT-[N] → RT-03 bypass").

### 4.7 RT-15[i] / RT-15[j] Boundary (Inter-Domain)

**Constitutional rule:** No RT-15 instance may directly mutate another RT-15 instance's domain state. Cross-domain mutations are always Kernel-mediated (Class A through RT-03). Cross-domain reads may be Class B.

**Constitutional basis:** A1 PAIR 58; D-6 §4.1 (cross-domain relationships); A1 §14.3 Forbidden Interactions ("RT-15[i] direct mutation of RT-15[j] state").

**Ground:** A0 §3.16 Responsibility 9 (cross-domain operations); RT15-INV-5.

---

## 5. Failure Propagation Analysis

### 5.1 If RT-15 (all twelve instances) fails

**Immediate constitutional consequences:**

1. **RT-11 blocked:** CUM synthesis cannot complete — RT-11 requires all 12 DUMs from RT-15. CivilizationalDecisionProposal formation halted. Constitutional Loop blocked at Understanding phase (CLI-1 violation).

2. **RT-09 impaired:** Domain-scoped Knowledge State production for RT-15 instances becomes unreceived. Domain-specific evidence pipeline disrupted.

3. **RT-10 impaired:** RT-10 cannot receive domain Understanding contributions. Domain Understanding Model synthesis incomplete.

4. **RT-12 impaired:** Domain compliance status not reported; civilizational compliance picture incomplete.

5. **Domain Governance failure:** All five Domain Governance obligations (Reality Alignment, Knowledge Integrity, Authority Integrity, Projection Integrity, Feedback Integrity) become unfulfilled (RT15-INV-2 violation).

6. **Domain Failure Mode Detection fails:** Domain Failure Modes (DF-1 through DF-8) not reported to RT-04 (RT15-INV-4 violation).

7. **Constitutional Loop disruption:** RT-14 DomainUpdateTrigger delivery targets become unavailable. Domain-level consequence integration blocked. Feedback loop structurally closed but domain-level update functionally disabled.

### 5.2 If a Single RT-15 Instance Fails

**Consequences depend on which instance:**

- **DOM-000001 failure:** Most severe. Root domain governance fails; CUM Critical State escalation response fails (RT15-INV-6 violation); civilizational integration fails.
- **DOM-000005 (Infrastructure) failure:** Substrate failure propagates to all other domains that depend on it (DOM-000002, DOM-000003, DOM-000004, DOM-000006, DOM-000007, DOM-000008, DOM-000009).
- **Any instance failure:** CUM synthesis BLOCK (RT-11 requires all 12 DUMs) — CUM synthesis cannot complete until the degraded instance is restored or enters constitutionally recognized degradation state (DKS-3/DKS-4 path).

**RT-11 response:** Per D7 §5.1, if more than four domains are degraded, RT-14 may escalate CUM Degradation Protocol directly to RT-11. RT-11 then escalates to RT-15 DOM-000001.

### 5.3 Failure Isolation

Per A1 PAIR 58 and A1 §14.3 Forbidden Interaction: RT-15 instances are constitutionally isolated — direct mutation between instances is prohibited. Failure of one instance does not directly corrupt another's constitutional state. Cross-domain dependencies (declared in domain profiles) define the propagation topology.

---

## 6. Special Domain Notes — Multiple Instance Architecture

### 6.1 Archetype vs. Instance

R15 specifies the **archetype** — the constitutional structure common to all twelve instances. Per R0 §3.19, R15 must document:
- The archetype specification (applies to all instances)
- The instantiation parameters (domain ID, domain-specific authority, domain-specific objects)
- Namespace isolation requirements between instances
- Cross-instance interaction rules (PAIR 58)

Each instance's domain-specific configuration (authority holders, domain scope, cross-domain relationships) is determined by the Domain Profile in D6.

### 6.2 Dependency Topology Among RT-15 Instances

The twelve domain instances are not constitutionally equal in dependency. Domain dependencies declared in D6 domain profiles create a constitutional dependency topology among RT-15 instances:

- DOM-000005 (Infrastructure) is the substrate for all other domains — no constitutional dependencies on other domains.
- DOM-000001 (Civilisation) is the root domain — receives CUM Critical State escalations from RT-11 via RT-06.
- Cascading failure risk: DOM-000005 failure cascades to multiple domains.

This topology must be documented in RS-04 (Scope) and RS-32 (Boundary Definitions) of R15.

### 6.3 Constitutional Consequence of 12-Instance Blocking

RT-11 CUM synthesis BLOCKS until all 12 DUMs are received. This means a single degraded RT-15 instance can block civilizational decision formation. The specification agent must document the constitutionally required degradation response in RS-21 (Failure Modes) and RS-22 (Recovery Conditions) for each failure scenario — including the DKS-3/DKS-4 degraded-understanding path that allows partial CUM synthesis under declared epistemic degradation.

---

*End of R15-CONSTITUTIONAL-DEPENDENCY-MAP.md*
