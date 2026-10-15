# R7 DESIGN CONSTRAINT REGISTER
## RT-07 Memory Runtime — Design Constraints, Prohibited Assumptions, and Open Questions

**Document:** Pre-specification design constraint register for R7-v1.0-canonical.md  
**Runtime:** RT-07 Memory Runtime  
**Constitutional seat:** A0 v1.1 §3.8  
**Prepared:** 2026-07-22  
**Status:** NOT READY FOR SPECIFICATION — See Required Decisions section

---

## PART 1 — MANDATORY REQUIREMENTS

These requirements are non-negotiable. They derive from A0 v1.1 §3.8 (authoritative), R0 v1.0 (specification standard), and D-series constitutional constraints. R7 MUST comply with all of them.

---

### MR-01 — Canonical Name is "Memory Runtime"

**Requirement:** R7 RS-01 must use "Memory Runtime" as the canonical runtime name.  
**Source:** A0 v1.1 §3.8, line 741; R0 RS-01 specification (verbatim A0 name required)  
**Why mandatory:** R0 RS-01 requires "canonical runtime name verbatim from A0." A0 §3.8 is the authoritative seat. Any other name (including "Temporal Coherence Runtime," "Temporal Runtime," or "Constitutional Temporal Authority Runtime") is constitutionally incorrect and will fail CERT-01.  
**Note:** R0's own runtime table (line 1206) incorrectly lists "Temporal Coherence Runtime" — this is an internal R0 inconsistency. R0's RS-01 completeness criterion takes precedence over R0's table.

---

### MR-02 — No D6 AIR-N Authority Type

**Requirement:** R7 RS-06 must NOT claim any D6 AIR-N authority type (AIR-1 through AIR-5).  
**Source:** A0 v1.1 §4.3 (RT-07 not in authority graph); D6 §4.3 (prohibits infrastructure runtime AIR-N delegation); R0 ADR-1 through ADR-4  
**Why mandatory:** RT-07 is an infrastructure runtime in Tier 2. D6 §4.3 prohibits delegating domain-actor authority types to infrastructure runtimes. A0 §4.3 does not list RT-07 in the authority graph. ADR-1 requires authority to trace D-series → A0 §4.3 → RS-06.  
**Note:** A1 §5.1 claims AIR-1 (Observation authority in temporal domain) for RT-07. This claim is constitutionally invalid and must be denied in RS-06 with disclosure.

---

### MR-03 — Append-Only Storage

**Requirement:** RT-07 must enforce append-only storage. No historical record may ever be modified.  
**Source:** RT07-INV-1; D3 RF-A8; D8 INV-2  
**Why mandatory:** Historical Inalienability (D3 RF-A8) is a D-series constitutional axiom. D8 INV-2 (Provenance Preservation) requires append-only provenance chains. RT07-INV-1 operationalizes these.

---

### MR-04 — No Deletion

**Requirement:** RT-07 must never delete any historical record. Terminal lifecycle state is Archived.  
**Source:** RT07-INV-2; D8 PROH-5; A0 §3.8 responsibility 6  
**Why mandatory:** D8 PROH-5 prohibits accountability record deletion. This is a D-series constitutional prohibition. No exception may be specified.

---

### MR-05 — Complete, Unbroken Provenance Chains

**Requirement:** RT-07 must maintain complete, unbroken provenance chains for all persisted objects.  
**Source:** RT07-INV-3; D8 INV-2  
**Why mandatory:** D8 INV-2 requires every constitutional object to carry a complete, unbroken provenance chain. RT-07 is the runtime responsible for maintaining this invariant.

---

### MR-06 — Highest Provenance Protection for Class B and Audit Records

**Requirement:** RT-07 must store all RT-03 Class B outputs and all RT-04 audit records with the highest provenance protection level. RT-04 audit records may not be modified by any other runtime.  
**Source:** RT07-INV-4; A0 §3.8 responsibilities 10, 11; D8 PROH-4  
**Why mandatory:** Class B outputs are the Kernel's constitutional decisions. RT-04 audit records are the audit authority's record. Both require maximum provenance protection per D8 PROH-4.

---

### MR-07 — Memory Closure is Lifecycle Event, Not Deletion

**Requirement:** RT-07 must implement memory closure as a constitutional lifecycle event. Closed memory must remain accessible to RT-04.  
**Source:** RT07-INV-5; A0 §3.8 responsibility 12; D-2 §XIII  
**Why mandatory:** D-2 §XIII (Philosophy of Memory) establishes that deliberate memory closure is a first-class constitutional capacity distinct from deletion. Closed memory retains RT-04 audit access.

---

### MR-08 — Historical Query Service

**Requirement:** RT-07 must provide HistoricalStateQueryResult to RT-09, RT-10, RT-11, RT-04, and RT-08 on demand.  
**Source:** A0 §3.8 responsibility 3; A0 §3.8 lines 768–769  
**Why mandatory:** RT-09, RT-10, RT-11 require historical state for epistemic continuity. RT-04 requires full historical access for audit. RT-08 requires historical state for contextualizing observations. These are constitutional dependencies established in A0.

---

### MR-09 — RT-03 Kernel Processing of All Writes

**Requirement:** All writes to RT-07 must be Kernel-processed (through RT-03). RT-07 must not accept writes that bypass RT-03.  
**Source:** A0 §3.8 dependencies (lines 777–778): "memory writes are Kernel-processed"  
**Why mandatory:** RT-03 is the Constitutional Enforcement Kernel. All constitutional object admissions require Kernel processing (RT-03). Objects not admitted through RT-03 are not constitutionally valid.

---

### MR-10 — Temporal Validity Metadata on Epistemic Objects

**Requirement:** RT-07 must maintain temporal validity metadata for all persisted epistemic objects.  
**Source:** A0 §3.8 responsibility 7  
**Why mandatory:** Temporal validity metadata (timestamps on when objects were valid) is constitutionally required for epistemic continuity. This is different from — and must not be conflated with — temporal ordering attestation (a function described in A1 but not in A0 §3.8).

---

### MR-11 — Support Collective Memory Reconciliation

**Requirement:** RT-07 must support collective memory reconciliation when domain memory records diverge, producing CollectiveMemoryReconciliationRecord.  
**Source:** A0 §3.8 responsibility 8; D-2 §XIII  
**Why mandatory:** D-2 §XIII establishes domain memory reconciliation as a constitutional capacity. RT-07 is the runtime responsible for this operation.

---

### MR-12 — RT-04 Access to All Historical Records

**Requirement:** RT-07 must provide complete audit access to all historical records for RT-04.  
**Source:** A0 §3.8 responsibility 9  
**Why mandatory:** RT-04 (Audit Runtime) requires unrestricted read access to all historical records. This is an architectural invariant for constitutional auditability.

---

### MR-13 — RS-01 Must Disclose Founding Actor Convention Nuance

**Requirement:** R7 RS-01 must disclose that SEED-7 in D4 Part 13 §13.4 is "FoundingRatification" (a constitutional object), not a runtime founding actor.  
**Source:** D4-v2.0-canonical.md §13.4, line 820; R6 v1.1.1 DEF-AUDIT-001 correction precedent  
**Why mandatory:** R6 v1.1.1 established the correct approach for this class of SEED-N conflict. R7 must follow the same pattern to avoid repeating DEF-AUDIT-001.

---

### MR-14 — A1 Identity Conflict Must Be Disclosed

**Requirement:** R7 RS-13 must contain a preamble disclosure that A1 v1.0 designates RT-07 as "Temporal Coherence Runtime" which is constitutionally incorrect per A0 v1.1 §3.8, and that A0 is authoritative.  
**Source:** R6 v1.1.1 RS-13 precedent; A0 v1.1 §3.8 constitutional superiority  
**Why mandatory:** The A1/A0 conflict for RT-07 is documented; disclosure is required per the pattern established in the RT-06 remediation. However, unlike RT-06, the A1 PAIR content is also functionally incorrect (not just mislabeled), which requires stronger disclosure.

---

## PART 2 — PROHIBITED ASSUMPTIONS

R7 MUST NOT make any of these assumptions when drafting RS-01 through RS-36.

---

### PA-01 — Do Not Assume A1 PAIR Content Is Correct

**Prohibited:** Adopting A1 PAIR descriptions (temporal attestation, Gate 6 temporal service, temporal sequence records, temporal anchoring) as RT-07 obligations.  
**Why prohibited:** A1's RT-07 PAIRs (09, 13, 17, 21, 24, 26, 28, 37, 38, 39) describe a "Temporal Coherence Runtime" that does not match A0 §3.8's Memory Runtime. None of A1's temporal functions appear in A0 §3.8's 12 responsibilities. Adopting them without adjudication would create obligations not grounded in A0.

---

### PA-02 — Do Not Assume RT-07 Holds Temporal Ordering Authority

**Prohibited:** Stating or implying that RT-07 provides temporal ordering, Gate 6 temporal attestation, or temporal sequence records as a constitutional service.  
**Why prohibited:** These functions are not in A0 §3.8. D6 §4.3 prohibits AIR-1 authority for infrastructure runtimes. A0 §4.3 does not list RT-07 in the authority graph.  
**Exception:** A0 §3.8 responsibility 7 (temporal validity metadata) is a legitimate RT-07 function — maintaining timestamps on persisted objects. This is NOT the same as temporal attestation or Gate 6 temporal ordering service.

---

### PA-03 — Do Not Assume R5's Temporal Runtime Description Applies

**Prohibited:** Using R5's extensive "Constitutional Temporal Runtime" / "Temporal Authority" descriptions of RT-07 as a basis for R7 obligations.  
**Why prohibited:** R5 followed A1's incorrect "Temporal Coherence Runtime" characterization. R5 line 382 also contains a citation error (cites A0 §3.7 for RT-07 temporal authority — §3.7 is RT-06). R5's temporal descriptions of RT-07 have no A0 §3.8 grounding.

---

### PA-04 — Do Not Assume RT-07 Owns Persisted Objects

**Prohibited:** Claiming RT-07 owns the source constitutional objects it persists (ObservationRecords, KernelOperations, etc.).  
**Why prohibited:** A0 §8.3 (line 1968) explicitly states: "Every runtime produces objects that RT-07 persists. RT-07 does not own the objects — it persists them." RT-07 owns its metadata objects (HistoricalStateRecord, ProvenanceChain, MemoryLifecycleRecord, CollectiveMemoryReconciliationRecord) only.

---

### PA-05 — Do Not Assume TemporalSequenceRecord Is an RT-07 Object

**Prohibited:** Including TemporalSequenceRecord in RT-07's owned objects list.  
**Why prohibited:** TemporalSequenceRecord appears only in A1 (as an object created by "Temporal Coherence Runtime"). It has no A0 §3.8 grounding and is not in RT-07's owned objects per A0 §3.8 line 761.

---

### PA-06 — Do Not Assume A0 §8.5 "RT-07 Temporal Validity" Means Gate 6 Attestation

**Prohibited:** Interpreting A0 §8.5 ("RT-03 Gate 6 and RT-07 temporal validity enforce temporal ordering") as constituting a Gate 6 temporal attestation obligation for RT-07.  
**Why prohibited:** A0 §8.5 appears to reference RT-07's temporal validity metadata (responsibility 7 — maintaining timestamps on persisted objects), not an active Gate 6 attestation service. This interpretation is ambiguous and requires adjudication, not assumption.

---

### PA-07 — Do Not Assume D8 Content Without Reading D8

**Prohibited:** Making specific D8 claims (beyond what is recoverable from A0 §7.x D8 audit section) without first locating and reading D8.  
**Why prohibited:** D8 is cited six times in A0 §3.8 as a primary authority source. D8 was not in the canonical file list provided to this audit and its canonical file status is unconfirmed. Specific D8 provisions (TI-1 through TI-5 full text, INV-2 full text, PROH-4/5 full text) must be verified from the source.

---

### PA-08 — Do Not Adopt R0 Runtime Table as Canonical RT-07 Name

**Prohibited:** Using R0's runtime table (which lists "Temporal Coherence Runtime" for RT-07 at line 1206) as the canonical name for R7 RS-01.  
**Why prohibited:** R0's own RS-01 completeness criterion requires "canonical runtime name verbatim from A0." A0 §3.8 says "Memory Runtime." R0's table is internally inconsistent with R0's own requirement. A0 governs.

---

### PA-09 — Do Not Begin RS-13 Content Before Adjudication

**Prohibited:** Writing RS-13 (External Interactions / A1 PAIRs) before the A0/A1 functional conflict is adjudicated.  
**Why prohibited:** All 10 A1 PAIRs for RT-07 describe temporal functions that conflict with A0 §3.8. Writing RS-13 before adjudication would require either (a) fabricating memory-function PAIR content not in A1, or (b) adopting temporal-function PAIR content not in A0 §3.8. Both violate the requirement to derive from constitutional sources.

---

## PART 3 — OPEN CONSTITUTIONAL QUESTIONS

These questions must be answered before R7 specification begins.

---

### OCQ-01 [CRITICAL] — Is RT-07 the Memory Runtime or the Temporal Coherence Runtime?

**Question:** A0 §3.8 defines RT-07 as Memory Runtime. A1 §5.1, R0, R5, and R1 define RT-07 as Temporal Coherence Runtime. Which is constitutionally correct, and what are the implications for R7 specification?

**Known:** A0 is constitutionally superior to A1. A0 §3.8 is authoritative. RT-07 must be specified as Memory Runtime.

**Unknown:** What happens to the temporal coherence functions described in A1? Who provides Gate 6 temporal attestation? Who provides temporal anchoring for OPL Stage 2? Do these functions belong to another runtime that A1 misidentified as RT-07?

**Resolution required:** Constitutional adjudication (equivalent to RT06-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md) to determine the disposition of A1's temporal functions for RT-07.

---

### OCQ-02 [CRITICAL] — What Is the Scope of A1-AMEND-001 for RT-07?

**Question:** A1-AMEND-001 was initiated to correct A1's misidentification of RT-06. Does A1-AMEND-001 also correct RT-07's misidentification? If not, what corrective action is needed for A1's 10 temporal PAIRs for RT-07?

**Resolution required:** Confirmation from A1-AMEND-001 scope or initiation of RT07-specific A1 amendment. If A1-AMEND-001 is expanded, the corrected A1 PAIRs (now describing memory functions) must be available before R7 RS-13 is written.

---

### OCQ-03 [CRITICAL] — Can CERT-06 Pass with A1 Temporal PAIRs?

**Question:** R0 CERT-06 requires RS-13 to be in bijective correspondence with all A1 PAIRs involving RT-07. All 10 A1 PAIRs describe temporal functions not in A0 §3.8. How can R7 achieve CERT-06?

**Options:**
1. Write RS-13 with full disclosure that A1 PAIR content is functionally incorrect for Memory Runtime, and indicate each PAIR's memory-function analog (where derivable from A0 §3.8)
2. Defer CERT-06 pending A1-AMEND-001 completion
3. Interpret A1 PAIRs' temporal content as memory-function content where there is overlap (e.g., PAIR 17 RT-03 commit → RT-07: adopt persistence side, disclose temporal attestation side as A1 error)

**Resolution required:** Adjudication decision.

---

### OCQ-04 [HIGH] — Where Does the Temporal Coherence Service Live?

**Question:** If RT-07 does not provide Gate 6 temporal attestation, temporal sequence records, or temporal anchoring, what runtime does? D4 §3.3 requires Gate 6 temporal integrity checking. A0 §3.5 (RT-03) doesn't describe RT-03 performing temporal ordering internally. RT-05 maintains temporal validity markers but is described as sourcing them from RT-07.

**Implications:** If this function has no home, a new runtime may be needed between R7 and later runtimes. If this function belongs to RT-03 or RT-05, those specifications may need amendment.

**Resolution required:** Architectural determination as part of OCQ-01 adjudication.

---

### OCQ-05 [HIGH] — Does D8 Exist as a File-Persisted Document?

**Question:** D8 is cited six times in A0 §3.8 as a primary authority source (§5.7, INV-2, PROH-4, PROH-5, TI-3, TI-4). SOURCE-REGISTER.md does not list D8. Is there a D8 canonical file in the repository?

**Resolution required:** Locate D8 canonical file. If it exists, read it completely before writing R7 RS-06, RS-20, RS-21, RS-22, RS-33. If it does not exist, determine the canonical source for D8's provisions (they may be incorporated into another document or may be conversation-record-only like D-2).

---

### OCQ-06 [HIGH] — What Are A0 §3.8 Responsibility 7's Exact Boundaries?

**Question:** A0 §3.8 responsibility 7 states: "Maintain temporal validity metadata for all persisted epistemic objects." A0 §8.5 references "RT-07 temporal validity" in the Gate 6 context. Does responsibility 7 cover only archival timestamp metadata, or does it extend to an active temporal ordering service?

**Implication:** If responsibility 7 covers only archival metadata, R7 cannot specify any Gate 6 service. If it extends to temporal ordering, some A1 PAIR content may be partially adoptable.

**Resolution required:** Constitutional adjudication.

---

### OCQ-07 [MEDIUM] — Does A1-AMEND-001 Correct the RT-07 PAIRs?

**Question:** A1-AMEND-001 was initiated to correct A1's RT-06 identity error. Was the RT-07 functional divergence identified as within scope? If A1 PAIRs 09, 13, 17, 21, 24, 26, 28, 37, 38, 39 are all wrong about RT-07's function, do they need individual correction or wholesale replacement?

**Resolution required:** A1-AMEND-001 scope review.

---

### OCQ-08 [MEDIUM] — What Is RT-07's Stage Participation?

**Question:** A0 §4.4 shows RT-07 participating in steps 5, 14, and 31 (persistence after specific constitutional operations). Does RT-07 participate in a named Stage, and if so, which one? Does RT-07 participate in Stage 9 (RT-03's commit stage)?

**Source to verify:** D4 v2.0 canonical stage definitions; A0 §4.4 full execution order.

---

### OCQ-09 [MEDIUM] — What Are the D6 Memory Domain Coherence Dimensions?

**Question:** D6 DOM-000004 establishes Memory as a civilization domain. D6 Part 9 defines domain coherence dimensions for each domain. What are the Memory domain's coherence dimensions, and how does RT-07's operation relate to them?

**Source to verify:** D6-v1.0-canonical.md Part 9 — Memory domain section.

---

### OCQ-10 [LOW] — R7's Founding Actor Convention

**Question:** By R-series convention (first established in R5 v1.0), R7 would designate "FoundingMemory (SEED-7)" as its founding actor. D4 §13.4 defines SEED-7 as "FoundingRatification" (a constitutional object). Should R7 use "FoundingMemory (SEED-7)" with the same disclaimer as R6, or should R7 use a different designation?

**Resolution:** Low priority. Follow R6 v1.1.1 RS-01 precedent (DEF-AUDIT-001 correction) — acknowledge R-series convention, do not claim D4 §13.4 alignment.

---

## PART 4 — AMBIGUITY RISK REGISTER

| Risk ID | Risk | Severity | Mitigation |
|---------|------|----------|------------|
| AMB-01 | All 10 A1 PAIRs are temporal-function interactions — CERT-06 cannot be satisfied with current A1 | CRITICAL | Adjudication required; cannot be resolved within R7 specification alone |
| AMB-02 | A0 §8.5 references "RT-07 temporal validity" in Gate 6 context — ambiguous whether this is archival metadata or active service | HIGH | Adjudication; conservative interpretation (archival metadata only) until resolved |
| AMB-03 | Temporal coherence service has no confirmed home if not in RT-07 — orphaned architectural function | HIGH | Architectural determination required |
| AMB-04 | D8 not confirmed as file-persisted — primary D8 provisions (INV-2, PROH-4, PROH-5) may not be verifiable from source | HIGH | Locate D8 file before writing RS-06, RS-20, RS-33 |
| AMB-05 | R0's runtime table lists wrong name for RT-07 — could cause CERT-01 auditor to flag RS-01 | MEDIUM | R7 uses A0 §3.8 name; note R0 table inconsistency in CERT-01 documentation |
| AMB-06 | A1-AMEND-001 scope uncertain — may not cover RT-07 temporal PAIR corrections | MEDIUM | Confirm scope before proceeding |
| AMB-07 | D-2 §XIII full content not file-verified — primary Memory philosophy source is conversation record only | MEDIUM | Use A0 citations of D-2 §XIII; acknowledge SOURCE-REGISTER limitation |
| AMB-08 | R5 "TemporalStateSignal" from RT-07 to RT-05 not in A0 §3.8 — if adopted in R7, creates non-A0-grounded output | MEDIUM | Exclude TemporalStateSignal from RS-09 unless adjudicated |
| AMB-09 | RT-07 dependency list (RT-03, RT-05) may be incomplete — RT-06 was added to R6 via A1 PAIR 26 | LOW | Verify full A1 PAIR set; add A1-grounded dependencies only where memory-function grounding exists |
| AMB-10 | Memory closure procedure not specified in A0 §3.8 — RS-12 execution steps are underspecified | LOW | Design decision within RT07-INV-5 and D-2 §XIII constraints |

---

## PART 5 — REQUIRED DECISIONS BEFORE WRITING R7

The following decisions must be made before any RS section of R7 can be written. Until these decisions are made, writing R7 risks producing an uncertifiable specification.

### Decision 1 [BLOCKING]: RT-07 Identity Adjudication

**Must decide:** What is the constitutional relationship between A0 §3.8 (Memory Runtime functions) and A1 §5.1 (Temporal Coherence Runtime functions) for RT-07? Specifically:
- Are A1's temporal PAIRs for RT-07 wholesale wrong (A1 AMEND required for all 10 PAIRs)?
- Or does A0 §3.8 responsibility 7 ground some temporal-adjacent function that maps to a subset of A1 PAIRs?
- Where does Gate 6 temporal attestation live if not in RT-07?

**Blocks:** RS-06, RS-08, RS-09, RS-10, RS-13, RS-35, CERT-03, CERT-06

---

### Decision 2 [BLOCKING]: D8 File Location and Reading

**Must do:** Locate and read D8 canonical file (D8-v1.0-canonical.md or equivalent). Extract D8 §5.7, INV-2, PROH-4, PROH-5, TI-3, TI-4 complete text.

**Blocks:** RS-06, RS-20, RS-22, RS-33

---

### Decision 3 [HIGH]: A1-AMEND-001 Scope Confirmation

**Must decide:** Does A1-AMEND-001 cover RT-07's 10 temporal PAIRs? If not, initiate RT07-specific amendment or expand A1-AMEND-001 scope.

**Blocks:** RS-13, CERT-06

---

### Decision 4 [HIGH]: Stage Participation Mapping

**Must do:** Read D4 v2.0 stage definitions and A0 §4.4 complete execution order to map RT-07's stage participation precisely.

**Blocks:** RS-28, RS-30, RS-31

---

### Decision 5 [MEDIUM]: D6 Memory Domain Coherence Dimensions

**Must do:** Read D6-v1.0-canonical.md Part 9 Memory domain coherence dimensions.

**Blocks:** RS-14

---

### Decision 6 [MEDIUM]: A1 §15.2 Loop Participation

**Must do:** Read A1-v1.0-canonical.md §15.2 to identify all loops involving RT-07.

**Blocks:** RS-16, RS-29

---

## FINAL READINESS DETERMINATION

## NOT READY FOR SPECIFICATION

**Blocking issues:**
1. Constitutional adjudication of RT-07 A0/A1 functional divergence not complete (all 10 A1 PAIRs describe temporal functions incompatible with A0 §3.8 Memory Runtime)
2. D8 canonical file not confirmed or read
3. CERT-06 satisfaction path not determined

**Non-blocking gaps (resolvable during specification):**
- D6 Part 9 Memory domain coherence dimensions
- A1 §15.2 loop participation
- A0 §4.4 complete execution order
- D7 Part 9 civilization coherence applicability
- Memory closure procedure design

**Estimated work before R7 can be written:**
1. RT07-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md (adjudication of the A0/A1 functional divergence)
2. RT07-ARCHITECTURAL-DECISION-RECORD.md (decisions arising from adjudication)
3. D8 file read (locate and read D8 canonical document)
4. A1-AMEND-001 scope confirmation or RT07-specific amendment initiation
5. D6 Part 9 + A1 §15.2 supplemental reads

**Upon completion of the above:** The constitutional foundation will be sufficient to write R7-v1.0-canonical.md following the R6 specification methodology.

---

*R7 Design Constraint Register completed: 2026-07-22*  
*Constitutional Auditor (Claude Sonnet 4.6)*  
*Status: Constraints documented — blocking resolution required before specification*
