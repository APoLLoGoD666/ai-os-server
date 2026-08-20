---
document: R15-SPECIFICATION-BASELINE
title: RT-15 Constitutional Specification Baseline
version: 1.0
status: RESEARCH — Phase 0 Baseline
date: 2026-07-24
prepared-for: RT-15 Specification Agent (R15-v1.0-canonical.md)
constitutional-sources: A0-v1.1.1-canonical.md §3.16; A1-v1.2-canonical.md; D6-v1.0-canonical.md; D4-v2.0-canonical.md; D5-v1.0-canonical.md; D7-v1.0-canonical.md; D8-v1.0-canonical.md; R0-v1.0-runtime-specification-standard.md
---

# R15-SPECIFICATION-BASELINE

## 1. Executive Summary

RT-15 is the Domain Runtime — a constitutional archetype instantiated twelve times (DOM-000001 through DOM-000012), one per civilization domain. It is the most structurally complex runtime in the architecture: every other runtime is a singleton; RT-15 alone is a twelve-instance composable archetype.

Constitutional sources for RT-15 are complete and consistent at the primary level (A0 §3.16, A1 §15.2, D6 entire document). Three subordinate conflicts exist between A0 and A1 regarding PAIR coverage and A1 §3.0 naming; all are resolvable under the authority precedence hierarchy (A0 governs over A1 on identity). No governing D-series document cited in A0 §3.16 is absent from the repository. R15 is ready for specification with full constitutional coverage.

---

## 2. Identity Section

### 2.1 Canonical Name (from A0-v1.1.1-canonical.md §3.16)

**RT-15 — Domain Runtime (Twelve Instances)**

### 2.2 A1 Designation (from A1-v1.2-canonical.md §3.0)

**RT-15 — Domain Runtime (×12)**

**Naming conflict:** MINOR — A0 uses "Twelve Instances" in parentheses; A1 uses "×12." These are semantically identical. No substantive conflict. A0 governs as primary source.

### 2.3 Tier Designation

**Tier 6 (Domain)** — per A0-v1.1.1-canonical.md §2.4 tier table:

> "Tier 6 | Domain | RT-15 (x12) | The twelve civilization domain instances"

Note: A1-v1.2-canonical.md §3.0 designates RT-15 as **T5** (Tier 5). A0 assigns Tier 6. This is a discrepancy. See Conflicts Register §11, C-1.

### 2.4 Constitutional Seat

**A0-v1.1.1-canonical.md §3.16** is the primary constitutional seat of RT-15.

### 2.5 Constitutional Authority (verbatim from A0 §3.16)

> "D6 (entire document, all twelve domain specifications); D8 Phase 3 (Domain Runtime as the third mandatory implementation phase); D6 Part 4 (five authority types per domain, AIR-1 through AIR-5); D6 Part 5 (domain knowledge states); D6 Part 6 (Domain Governance Model, five obligations); D6 Part 8 (Cross-Domain Architecture); D6 Part 9 (six Domain Failure Modes)."

---

## 3. Responsibilities

Source: A0-v1.1.1-canonical.md §3.16 "Responsibilities (per instance)"

**Total: 15 responsibilities**

1. Maintain the Domain Profile: Domain Identity, Reality Context, Internal Representation, Relationships, Authority Record, Knowledge Status, Projection Status
2. Operate the Domain Authority Record for all five authority types (Observation, Interpretation, Decision, Projection, Audit) specific to this domain
3. Manage the Domain ActorProfile Registry: all actors with authority in this domain
4. Maintain the Domain Knowledge Chain: the epistemic history specific to this domain
5. Coordinate with RT-09 (Knowledge Runtime) for domain-scoped Knowledge States (DKS-1 through DKS-4)
6. Coordinate with RT-10 (Intelligence Runtime) for domain-level reasoning
7. Assess Domain Coherence across all six Domain Coherence Dimensions (D6 Part 9)
8. Detect all eight Domain Failure Modes (DF-1 through DF-8) and report to RT-04 and human governance actors
9. Participate in cross-domain operations: resolve cross-domain conflicts per D6 Part 8; maintain the five domain relationship types (Dependency, Substrate, Influence, Conflict, Resource Sharing)
10. Provide Domain Understanding Model to RT-11 (Civilization Intelligence Runtime) for CUM synthesis
11. Receive domain coherence status from RT-06
12. Receive domain-level Understanding updates from RT-14 (Reflection Runtime feedback)
13. Coordinate with RT-16 (Amendment Runtime) for domain deliberation participation in constitutional amendments
14. Fulfill all five Domain Governance obligations: Reality Alignment, Knowledge Integrity, Authority Integrity, Projection Integrity, Feedback Integrity (D6 Part 6)
15. For DOM-000001 (Civilisation domain): provide root domain governance; all other domains exist within DOM-000001's scope; manage civilizational integration; respond to CUM Critical State escalations from RT-06 and RT-11

**Specification note:** Responsibility 15 is DOM-000001-specific (conditional on instance identity). The archetype specification must distinguish universal responsibilities (1–14) from conditional responsibilities (15 applies to DOM-000001 instance only).

---

## 4. Invariants

Source: A0-v1.1.1-canonical.md §3.16

**Total: 6 invariants**

- **RT15-INV-1:** Every domain instance maintains a current, constitutionally valid Domain Profile at all times
- **RT15-INV-2:** Every domain instance fulfills all five Domain Governance obligations (D6 Part 6)
- **RT15-INV-3:** Audit Authority for a domain is never held by an actor who holds any other authority type in the same domain (AIR-5) — enforced by coordination with RT-02
- **RT15-INV-4:** Domain Failure Modes (DF-1 through DF-8) are always reported to RT-04 and human governance actors — never silently absorbed
- **RT15-INV-5:** Every domain instance participates in cross-domain conflict resolution per D6 Part 8
- **RT15-INV-6:** DOM-000001 (Civilisation domain) responds to CUM Critical State escalations without exception

**Note:** The A0 §3.16 heading reads "six Domain Failure Modes" in the Constitutional Authority citation but the Responsibilities (item 8) correctly state "eight Domain Failure Modes (DF-1 through DF-8)." The invariant RT15-INV-4 references "DF-1 through DF-8" (eight). The specification agent must derive from D6 Part 9 and use DF-1 through DF-8 (eight) as authoritative. See Conflicts Register §11, C-2.

---

## 5. Owned Constitutional Objects

Source: A0-v1.1.1-canonical.md §3.16 "Owned Constitutional Objects (per instance)"

Exact verbatim list:

> **DomainProfile; DomainAuthorityRecord; DomainActorProfileRegistry; DomainKnowledgeChain; DomainCoherenceAssessment; DomainFailureModeRecord; CrossDomainRelationshipRecord.**

**Count: 7 owned object types**

Additionally, A0 §3.16 lists:

**Consumed Constitutional Objects:**
> "DomainKnowledgeState (from RT-09); DomainUnderstandingModel (from RT-10); DomainCoherenceStatus (from RT-06); domain-level update triggers (from RT-14); ActorProfile and authority records (from RT-01 and RT-02)."

**Produced Constitutional Objects:**
> "DomainProfile updates; DomainUnderstandingModel (to RT-11); DomainFailureModeRecord (to RT-04); CrossDomainRelationshipRecord."

**A1 §6.1 object flow note:** A1 §6.1 Object Flow Table lists "Domain Understanding Model" with Creating Runtimes: "RT-10, RT-15" — confirming RT-15 co-produces DomainUnderstandingModel with RT-10.

---

## 6. Authority

### 6.1 Authority Derivation Chain

**Step 1 — D6 §4.2–4.6 (Type Definitions):**
- AIR-1: Observation Authority — right to initiate Observation Projections and register Observation Records within a domain
- AIR-2: Interpretation Authority — right to apply registered interpretation protocols to Observation Records within a domain
- AIR-3: Decision Authority — right to form CivilizationalDecisions within a domain
- AIR-4: Projection Authority — right to authorize and execute Action Projections within a domain
- AIR-5: Audit Authority — right to assess constitutional compliance; must be independent of all other authority types in the same domain

**Step 2 — A0 §4.3 (Authority Relationship Graph):**
> "RT-02 grants and holds: Observation Authority (for each of twelve domains) → granted to actors in RT-15 domain registries; Interpretation Authority (for each domain) → granted to actors in RT-15 domain registries; Decision Authority (for each domain) → granted to actors; validated at RT-12; Projection Authority (for each domain) → granted to actors; validated at RT-13; Audit Authority (for each domain) → held independently (AIR-5); realized by RT-04"

> "AUTHORITY FLOWS FROM: Human Governance Actors → Founding Authority Root → RT-02 → all five authority types → actors in RT-15"

**Step 3 — A1 §5.1 (Authority Type Distribution Table):**

| Runtime | AIR-1 (Observe) | AIR-2 (Interpret) | AIR-3 (Decide) | AIR-4 (Project) | AIR-5 (Audit) |
|---------|-----------------|-------------------|----------------|-----------------|---------------|
| RT-15 | Domain-specific | Domain-specific | Domain-specific | — | — |

### 6.2 Authority RT-15 Holds

- **AIR-1 (Observation Authority):** Domain-specific — within each domain's registered scope
- **AIR-2 (Interpretation Authority):** Domain-specific — within each domain's registered scope
- **AIR-3 (Decision Authority):** Domain-specific — within each domain's registered scope

### 6.3 Authority RT-15 Does NOT Hold

- **AIR-4 (Projection Authority):** RT-15 does not hold AIR-4. Domain-specific actions requiring external projection route through RT-13 (A1 PAIR 57). RT-15 submits Action Request → RT-03 admits → RT-13 executes.
- **AIR-5 (Audit Authority):** RT-15 does not hold AIR-5. RT-04 independently holds AIR-5 and audits all 12 RT-15 instances (A1 PAIR 56).

### 6.4 Authority Over RT-15

- RT-03 holds Constitutional Enforcement Authority — gates all Class A operations from RT-15
- RT-04 holds Constitutional Audit Authority (AIR-5) — audits all 12 RT-15 instances
- RT-02 maintains domain-specific authority maps used by all twelve domain instances

### 6.5 D6 §4.7 Authority Integrity Rules (Separate System)

D6 §4.7 defines five Authority Integrity Rules (AIR-1 through AIR-5 as Rules, distinct from §4.2–4.6 authority types). These are constraints on how authority types are exercised:
- AIR-1 (Authority Separation): five authority types must not be collapsed within any domain actor
- AIR-2 (No Unauthorized Projection): no projection without AIR-4 assignment
- AIR-3 (No Knowledge Monopolization): at least two actors must hold Observation and Interpretation Authority in any domain
- AIR-4 (No Hidden Decisions): Decision Authority must produce registered Decision Records
- AIR-5 (Audit Independence): Audit Authority must be independent — enforced by RT15-INV-3

RT-15 is the primary enforcer of AIR-1 through AIR-5 at the domain level, through its DomainAuthorityRecord and DomainActorProfileRegistry.

---

## 7. Dependencies

Source: A0-v1.1.1-canonical.md §3.16 "Dependencies (per instance)"

Exact verbatim:

> "RT-01, RT-02, RT-03 (constitutional infrastructure); RT-09 (Knowledge States); RT-10 (domain-level understanding); RT-07 (Memory); RT-06 (Coherence reports for domain)."

**Count: 7 dependencies** (RT-01, RT-02, RT-03, RT-06, RT-07, RT-09, RT-10)

**Note:** R11-v1.3-canonical.md RS-26 lists RT-15 as a dependency for RT-11 ("domain-level Understanding Models"). This is reflected in A0 §3.12: "RT-15 (domain-level Understanding Models)" appears in RT-11's Dependencies. This is a **dependent flow** (RT-15 outputs to RT-11), not a dependency of RT-15 itself. RT-15 does NOT depend on RT-11 — RT-11 depends on RT-15.

**Additional flow from A0 §4.2 Information Flow Graph:**
- RT-14 → DomainUpdateTrigger → RT-15 (trigger, not a dependency in A0 §3.16)
- RT-11 → CUMDegradationEscalation → RT-15 DOM-000001 (conditional, not in A0 §3.16 dependencies)

The specification agent must use the A0 §3.16 dependencies list (7 entries) as the bijection standard for RS-26. A1 PAIRs provide behavioral detail; A0 §4.1 provides the canonical dependency list.

---

## 8. Dependents

Source: A0-v1.1.1-canonical.md §3.16

Exact verbatim:

> "RT-11 (receives Domain Understanding Models from all twelve instances)."

**Count: 1 dependent** — RT-11

**Cross-check note:** This single dependent is confirmed in A0 §4.1 Dependency Graph:
> "RT-15 (Domain, x12) → RT-11 (Domain Understanding Models); → RT-16 (domain deliberation participation in amendments)"

RT-16 appears in A0 §4.1 as a RT-15 output but is NOT listed in A0 §3.16 Dependents. The specification agent must disclose this as Conflict C-3 (see §11) and use the A0 §3.16 Dependents list as the bijection standard while noting the A0 §4.1 RT-16 flow as a supplemental interaction.

---

## 9. PAIR Registry

All PAIRs from A1-v1.2-canonical.md §3.5 where RT-15 is a party:

| PAIR | Counterpart | Exists | Direction | Type | Constitutional Basis |
|------|-------------|--------|-----------|------|---------------------|
| PAIR 51 | RT-09 | YES | Bidirectional | RT-15→RT-09: Class A (Kernel-mediated); RT-09→RT-15: Epistemic query | M2, D-6 domain authority types |
| PAIR 52 | RT-10 | YES | Bidirectional | RT-15→RT-10: DUM delivery; RT-10→RT-15: DUM update query (BLOCK) | M2, D-6, D-7 |
| PAIR 53 | RT-12 | YES | Bidirectional | RT-12→RT-15: compliance determinations; RT-15→RT-12: compliance status | M2, D-6 |
| PAIR 54 | RT-05 | YES | Kernel-mediated (writes); direct read | Class A mutations Kernel-mediated; RT-15 reads RT-05 directly | M2, M4 |
| PAIR 55 | RT-03 | YES | Unidirectional (RT-15 submits Class A) | RT-15→RT-03 only | M2, KMP |
| PAIR 56 | RT-04 | YES | Unidirectional (RT-04 audits RT-15) | RT-04 audit; Standard AIR-5 pattern | M1 (AIR-5), M3 |
| PAIR 57 | RT-13 | YES | Conditional | Domain-specific actions requiring external projection; RT-15 does not directly address RT-13 | M2, D-6 |
| PAIR 58 | RT-15 (Inter-Domain) | YES (Conditional) | Bidirectional (Kernel-mediated for mutations) | Cross-domain authority request; Class A for mutations; Class B for reads | D-6 §4.1, M4 |

**Additional PAIRs from A1 covering RT-15 interactions not in §3.5:**

Per A1 §13.2 Permission Matrix (RT-15 row):
```
RT15: NONE NONE KRNL NONE KRNL NONE QURY NONE DLVR DLVR NONE DLVR NONE NONE PEER NONE
```
This maps to: RT-03 (KRNL), RT-05 (KRNL), RT-07 (QURY), RT-09 (DLVR), RT-10 (DLVR), RT-12 (DLVR), RT-15[inter] (PEER).

**PAIRs for RT-15 ↔ RT-01, RT-02, RT-06, RT-07, RT-11, RT-14, RT-16 not explicitly numbered in §3.5** but governed by A1 Rules R1–R4 and the permission matrix. The specification agent must account for all these interactions in RS-13, including the RT-14→RT-15 DomainUpdateTrigger (noted in A0 §4.2 and A1 §14.1) and the RT-06→RT-15 DomainCoherenceStatus flow (A0 §4.2).

---

## 10. Constitutional Loop Position

Source: A1-v1.2-canonical.md §15.2

| Constitutional Loop Phase | RT-15 Role |
|--------------------------|------------|
| Observation | SUPPORTING — NOT listed in §15.2 primary or supporting for this phase |
| Evidence | SUPPORTING — NOT listed in §15.2 primary or supporting for this phase |
| Knowledge | **SUPPORTING** (A1 §15.2: "Knowledge | RT-09 (advanced) | RT-15") |
| Understanding | **SUPPORTING** (A1 §15.2: "Understanding | RT-10 | RT-15, RT-09") |
| Deliberation | ABSENT |
| Decision | ABSENT |
| Action | ABSENT |
| Consequence | ABSENT |
| Observation of Consequence | ABSENT — RT-14→RT-08 is PRIMARY; RT-07, RT-06 are SUPPORTING |
| Updated Understanding | **SUPPORTING** (A1 §15.2: "Updated Understanding | RT-09→RT-10→RT-11 | RT-15") |

**RT-15 is PRIMARY in NO phase.**
**RT-15 is SUPPORTING in THREE phases:** Knowledge, Understanding, Updated Understanding.
**RT-15 is ABSENT from SEVEN phases:** Observation, Evidence, Deliberation, Decision, Action, Consequence, Observation of Consequence.

**Constitutional Foundation Layer (A1 §15.2 note):** RT-01, RT-02, RT-03, RT-04, RT-05, RT-06, RT-07 are present at every phase as Foundation Layer runtimes. RT-15 is NOT in the Constitutional Foundation Layer.

**Execution position (A0 §4.4):**
- STEP 16: RT-15 receives Domain Understanding Model update, assesses Domain Coherence, checks Domain Failure Modes (between RT-10 DUM update and RT-11 CUM synthesis)
- STEP 30: RT-15 receives domain Understanding Model update trigger from RT-14 (feedback loop)

---

## 11. Conflicts Register

### C-1: Tier Designation Discrepancy

**Source A:** A0-v1.1.1-canonical.md §2.4 tier table: **"Tier 6 | Domain | RT-15 (x12)"**
**Source B:** A1-v1.2-canonical.md §3.0 table: **"T5 | Domain-specific processing (12 instances)"**

**Discrepancy:** A0 assigns RT-15 to Tier 6; A1 §3.0 assigns T5.

**Which governs:** A0 governs per authority precedence hierarchy. A0 is the primary architectural document; A1 derives from A0. A0 §3.16 is the constitutional seat.

**Resolution:** The specification agent must use Tier 6 (T6) as the canonical tier designation, citing A0 §2.4. The agent must disclose the A1 §3.0 discrepancy in RS-01 and note A0 governs. The discrepancy in A1 is a known inconsistency in A1 §3.0 designations (similar to the RT-10 naming discrepancy noted in R10-v1.1-canonical.md RS-02.1).

### C-2: Domain Failure Mode Count Inconsistency

**Source A:** A0 §3.16 Constitutional Authority citation: **"D6 Part 9 (six Domain Failure Modes)"**
**Source B:** A0 §3.16 Responsibility 8: **"Detect all eight Domain Failure Modes (DF-1 through DF-8)"**

**Discrepancy:** The Constitutional Authority citation says "six" failure modes; Responsibility 8 says "eight" and specifies DF-1 through DF-8.

**Which governs:** The Responsibilities section is operationally determinative. The specification DF-1 through DF-8 (eight) appears in both the Responsibilities and the Invariant (RT15-INV-4 references "DF-1 through DF-8"). D6 Part 9 is the governing source.

**Resolution:** The specification agent must read D6 Part 9 directly and use the count therein. The Constitutional Authority citation's "six" is likely a drafting error in A0. RS-05 must reference D6 Part 9 as the authoritative source; the agent should not assume six without verifying D6 Part 9.

### C-3: RT-16 in A0 §4.1 Not in A0 §3.16 Dependents

**Source A:** A0 §3.16 Dependents: **"RT-11 (receives Domain Understanding Models from all twelve instances)."** — RT-16 absent.
**Source B:** A0 §4.1 Dependency Graph: **"RT-15 (Domain, x12) → RT-11; → RT-16 (domain deliberation participation in amendments)"**

**Discrepancy:** The RT-16 flow appears in the dependency graph but not in the §3.16 Dependents list.

**Which governs:** A0 §3.16 is the primary seat for RS-27 bijection. A0 §4.1 provides supplemental graph information. Per R0 CERT-04, RS-27 must be in bijective correspondence with A0 §4.1. The RT-15→RT-16 relationship exists in A0 §4.1 and must therefore appear in RS-27 even if §3.16 Dependents does not list RT-16.

**Resolution:** RS-27 must include RT-16 as a dependent based on A0 §4.1, disclosed as absent from A0 §3.16 Dependents proper but present in the dependency graph. The specification agent must also check A1 PAIR 63 (RT-15 ↔ RT-16) or relevant rule coverage.

### C-4: PAIR 53 (RT-15 ↔ RT-12) — A1 PAIR Exists, No A0 §3.16 Dependency Basis

**Source A:** A0 §3.16 Dependencies: RT-12 is NOT listed.
**Source B:** A1-v1.2-canonical.md §3.5 PAIR 53: RT-15 ↔ RT-12 interaction exists (bidirectional).

**Discrepancy:** A1 specifies a PAIR 53 interaction between RT-15 and RT-12 (compliance determinations), but RT-12 is not listed in A0 §3.16 Dependencies.

**Which governs:** A1 PAIRs derive from D-series constitutional requirements (M2 method derivation). The PAIR 53 is derived from D-6, not from A0 §3.16 Dependencies. This is not a conflict — it reflects a runtime interaction (domain compliance determination by RT-12) that is constitutionally required but expressed through A1 PAIRs rather than A0 §3.16 dependency list. RS-13 must include PAIR 53; RS-26 must not add RT-12 as a dependency without A0 §4.1 basis.

**Resolution:** Include PAIR 53 in RS-13 (interactions). Do not add RT-12 to RS-26 (dependencies) without disclosing the absence of A0 §4.1 basis (follow precedent from R12-v1.0-FINAL-CERTIFICATION-AUDIT.md which noted an identical issue for RT-12's perspective).

---

## 12. Domain Architecture Notes

### 12.1 Twelve-Instance Archetype

Per A0 §3.16 Note on Twelve Instances (verbatim):
> "RT-15 represents a single runtime archetype instantiated twelve times — once for each domain (DOM-000001 through DOM-000012). Each instance has the same constitutional structure and the same responsibilities. The specific constitutional character of each instance is determined by the Domain Profile for that domain as specified in D6. This specification defines RT-15 at the archetype level. R15 (Runtime Specification 15) will specify the archetype in full; implementation documents will specify each instance's domain-specific configuration."

Per R0 §3.19:
> "For RT-15 only: R15 must document the archetype specification that applies to all instances, the instantiation parameters that differentiate each instance (domain ID, domain-specific authority, domain-specific objects), the namespace isolation requirements between instances, and the cross-instance interaction rules."

### 12.2 Twelve Domain Profiles (from A0 §3.16)

| Instance | Domain ID | Key Characteristics |
|----------|-----------|---------------------|
| DOM-000001 | Civilisation | Root domain; no external dependencies; receives CUM Critical State escalations; governs civilizational integration |
| DOM-000002 | Intelligence | Epistemic engine; Claude API as major ExternalSystem; depends on DOM-000003 and DOM-000004 |
| DOM-000003 | Registry | Semantic brain; single source of truth; substrate for all major domains; depends on DOM-000005 |
| DOM-000004 | Memory | Persistence and retrieval; depends on DOM-000005 |
| DOM-000005 | Infrastructure | Physical/computational substrate; provides substrate for ALL other domains; no constitutional dependencies |
| DOM-000006 | Observability | Civilization self-perception; depends on DOM-000003 and DOM-000005 |
| DOM-000007 | Interface | Human interaction surface; highest frequency outbound projections; depends on DOM-000002 and DOM-000003 |
| DOM-000008 | Knowledge | Organized knowledge accumulation; depends on DOM-000004 and DOM-000003 |
| DOM-000009 | Development | Governance of how civilization evolves its own codebase; depends on DOM-000005 |
| DOM-000010 | Experiments | Constitutional containment space; bounded from operational domains |
| DOM-000011 | Reality Architecture | Epistemic substrate domain; depends on DOM-000004 and DOM-000006 |
| DOM-000012 | Theory of Change | Causal tracking and outcome validation; depends on DOM-000011 and DOM-000002 |

### 12.3 D8 Phase 3 Assignment

RT-15 is the mandatory Phase 3 implementation target per D8. Phase 3 operationalizes:
- Domain Profiles for all twelve domains (D6 Part 2.5)
- Domain Authority Records with all five authority types (D6 Part 4)
- Domain ActorProfile Registries with Correspondent Registration capability (D6 Part 6)
- Domain Knowledge Chains (D6 Part 5.1)
- Domain Understanding Models with DUM-1 through DUM-4 compliance
- Domain Governance Model: Reality Alignment, Knowledge Integrity, Authority Integrity, Projection Integrity, Feedback Integrity (D6 Part 7)
- Civilization Graph (D6 Part 8)
- Cross-Domain Reasoning (D7 Part 6)
- Domain Failure Mode detection (D6 Part 10)
- Action Projection Lifecycle for domain-scoped projections (D5 Part 4)

### 12.4 CUM Critical State and DOM-000001 Special Provisions

RT-11 escalates CUM Critical State (>4 domains degraded) to RT-15 DOM-000001 via RT-06. RT15-INV-6 mandates that DOM-000001 responds without exception. This creates a conditional, instance-specific interaction not shared by other RT-15 instances. The specification agent must address this in RS-15 (Conditional Responsibilities) for the DOM-000001 archetype variant.

---

## 13. Pre-Write Conditions

The specification agent MUST satisfy all of the following before writing any RS section:

**CONDITION 1:** Read A0-v1.1.1-canonical.md §3.16 in full (primary constitutional seat).

**CONDITION 2:** Read A1-v1.2-canonical.md §3.0, §5.1, §13.2, §14.3, §14.4, §15.2, and all RT-15 PAIRs (§3.5 PAIR 51–58 plus Rule coverage).

**CONDITION 3:** Read D6-v1.0-canonical.md in its entirety (entire document is the constitutional authority per A0 §3.16 — specifically Parts 2, 4, 5, 6, 7, 8, 9, 10).

**CONDITION 4:** Read R0-v1.0-runtime-specification-standard.md Part 3 (§3.14 through §3.19 for lifecycle, composition, and archetype-specific documentation requirements) and Part 7 (CERT-01 through CERT-10).

**CONDITION 5:** Read D8-v1.0-canonical.md Phase 3, INV-1 through INV-7, CLI-1 through CLI-4, PROH-1 through PROH-9, TI-1 through TI-5.

**CONDITION 6:** Read D5-v1.0-canonical.md Part 4 (Action Projection Lifecycle — domain-scoped projections from RT-15 route through this).

**CONDITION 7:** Read D7-v1.0-canonical.md §1.3 (D6/D7 boundary), §3.1 (CUM synthesis — RT-15 provides DUMs), Part 6 (Cross-Domain Reasoning), Part 11 (DOM-000001 governance).

**CONDITION 8:** Verify D6 Part 9 failure mode count (resolve C-2: six vs. eight Domain Failure Modes).

**CONDITION 9:** Read R14-v1.0-canonical.md RS-27 and RS-32 for RT-14/RT-15 boundary definition (domain update triggers).

**CONDITION 10:** Read R11-v1.3-canonical.md RS-26 and RS-32 for RT-11/RT-15 boundary (DUM provision).

**CONDITION 11:** Read R9-v1.0-canonical.md RS-27 (RT-09 lists RT-15 as dependent for domain-scoped knowledge states).

**CONDITION 12:** Read R10-v1.1-canonical.md RS-27 (RT-10 lists RT-15 as dependent) and RS-32.

**CONDITION 13:** Resolve Conflict C-1 (tier designation) by citing A0 §2.4 as governing; document the A1 §3.0 discrepancy.

**CONDITION 14:** Resolve Conflict C-3 (RT-16 dependency graph vs. §3.16 dependents) before writing RS-27.

---

*End of R15-SPECIFICATION-BASELINE.md*
