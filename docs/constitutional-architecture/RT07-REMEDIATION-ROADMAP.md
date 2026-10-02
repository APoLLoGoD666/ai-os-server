# RT07-REMEDIATION-ROADMAP.md
## RT-07 Constitutional Remediation Roadmap

**Document:** Exact next steps for RT-07 constitutional remediation program  
**Adjudication basis:** RT07-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md  
**Pair basis:** RT07-PAIR-ADJUDICATION-REGISTER.md  
**Date:** 2026-07-22

---

## SECTION 1 — REQUIRED BEFORE R7 SPECIFICATION

These steps must be completed before R7-v1.0-canonical.md is written.

---

### STEP 1: CONFIRM THIS ADJUDICATION AS AUTHORITATIVE

**Action:** The determinations in RT07-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md (DET-01 through DET-08) become the authoritative constitutional basis for R7.

**Deliverable:** RT07-CONSTITUTIONAL-VERDICT.md (produced alongside this document).

**Enables:** All subsequent steps.

---

### STEP 2: INITIATE A1-AMEND-001 SCOPE EXPANSION (RT-07 COVERAGE)

**Action:** Expand the scope of A1-AMEND-001 (currently covering RT-06 identity correction) to include RT-07 corrections. If A1-AMEND-001 has already been initiated with a fixed scope, initiate a separate A1-AMEND-002 for RT-07.

**Minimum scope for RT-07 amendment:**

| Item | What changes |
|------|-------------|
| A1 §3.0 runtime catalog entry | "Temporal Coherence Runtime" → "Memory Runtime"; role: "Temporal ordering, sequence integrity" → "Durable persistence, provenance chains, historical state provision" |
| A1 §5.1 runtime catalog | Same name/role correction |
| A1 §5.1 authority type | Remove AIR-1 "Temporal domain" — RT-07 holds no AIR-N authority type |
| A1 §6.1 object ownership | Remove "Temporal Sequence Record" — no constitutional basis |
| A1 §7.1 mutation ownership | Remove RT-07 temporal sequence record mutation entry |
| A1 PAIR 09 | Full replacement per RT07-PAIR-ADJUDICATION-REGISTER.md |
| A1 PAIR 13 | Full replacement per RT07-PAIR-ADJUDICATION-REGISTER.md |
| A1 PAIR 17 | Partial replacement — remove RT-07 → RT-03 blocking direction |
| A1 PAIR 21 | Minor reframe |
| A1 PAIR 24 | Partial replacement — remove RT-07 → RT-05 direction |
| A1 PAIR 26 | Full reconstitution |
| A1 PAIR 28 | Function reframe |
| A1 PAIR 37 | Function reframe |
| A1 PAIR 38 | Function reframe |
| A1 PAIR 39 | Function reframe |
| New PAIR (RT-07 ↔ RT-14) | Add missing PAIR per RT07-PAIR-ADJUDICATION-REGISTER.md |

**Note:** This amendment does NOT need to be completed before R7 specification begins. R7 RS-13 will disclose the A1 conflict and document correct PAIR characterizations from A0. This follows the R6 v1.1 precedent. However, the amendment must be formally initiated before R7 goes to certification.

**Deliverable:** A1-AMEND-001 (expanded) or A1-AMEND-002 scoping document.

---

### STEP 3: READ D6 PART 9 MEMORY DOMAIN COHERENCE DIMENSIONS

**Action:** Read D6-v1.0-canonical.md Part 9 Memory domain section to extract the Memory domain coherence dimensions that R7 RS-14 will specify.

**What to extract:**
- DOM-000004 full coherence dimension specification
- Memory domain coherence metrics (currency of historical records, provenance chain completeness, query availability, memory lifecycle health)
- Any RT-07-specific coherence rules

**Source:** D6-v1.0-canonical.md Part 9 §9.x (Memory domain section)

**Deliverable:** Short research note or direct incorporation into R7 RS-14 draft.

---

### STEP 4: READ A1 §15.2 RT-07 LOOP PARTICIPATION

**Action:** Read A1-v1.0-canonical.md §15.2 to identify all constitutional loops involving RT-07.

**What to extract:**
- Which loops include RT-07?
- What is RT-07's role in each loop (contributor, gatekeeper, participant)?
- CLI-1 through CLI-4 compliance implications for RT-07?
- Note: A1 §15.2 will characterize RT-07 as "Temporal Coherence Runtime" — loops involving RT-07 must be re-evaluated under the correct Memory Runtime characterization

**Source:** A1-v1.0-canonical.md §15.2

**Deliverable:** Short research note or direct incorporation into R7 RS-16/RS-29 draft.

---

### STEP 5: READ A0 §4.4 EXECUTION ORDER — RT-07 STEPS

**Action:** Read A0-v1.1-canonical.md §4.4 complete execution order. Extract all steps where RT-07 participates.

**Known:** Steps 5, 14, 31 mention RT-07 (lines 1420, 1435, 1479). Confirm no additional steps missed.

**Source:** A0-v1.1-canonical.md §4.4

**Deliverable:** Complete RT-07 execution step list for RS-28, RS-30.

---

## SECTION 2 — R7 SPECIFICATION SCOPE

When Steps 1–5 are complete (Step 2 may be in-flight), R7 specification may begin.

### R7-v1.0-canonical.md Content Summary

**Identity:** RT-07, Memory Runtime, T2, A0 v1.1 §3.8  
**Founding actor:** FoundingMemory (SEED-7) — with DEF-AUDIT-001 equivalent disclaimer (SEED-7 in D4 §13.4 is "FoundingRatification" constitutional object)  
**Authority:** No AIR-N type; mandate authority from D-2 §XIII, D8 §5.7, D3 RF-A8, D6 DOM-000004 scope  
**Obligations:** O7-1 through O7-12 per A0 §3.8 responsibilities 1–12  
**Owned objects:** HistoricalStateRecord, ProvenanceChain, MemoryLifecycleRecord, CollectiveMemoryReconciliationRecord  
**Consumed:** All constitutional objects from all runtimes (via RT-03/RT-05 pipeline)  
**Produced:** HistoricalStateRecord (versions), ProvenanceChain segments, HistoricalStateQueryResult  
**Dependencies:** RT-03, RT-05  
**Dependents:** RT-09, RT-10, RT-11, RT-04 (A0 §3.8); RT-08, RT-14 (A0 cross-references)  
**Invariants:** RT07-INV-1 through RT07-INV-5  
**D-series:** D8 §5.7, INV-2, PROH-4, PROH-5, TI-3, TI-4; D3 RF-A8; D6 DOM-000004  
**RS-13 (A1 PAIRs):** Full conflict disclosure; correct characterizations from A0 for all 10 PAIRs; note missing RT-14 PAIR  
**RS-35 (Prohibited):** Temporal ordering authority; Gate 6 attestation; modification or deletion of historical records; ownership of source objects

### RS-13 Conflict Disclosure Approach

R7 RS-13 must contain a preamble disclosure equivalent to R6 v1.1's A1 Identity Conflict Disclosure, but more comprehensive:

```
A1 IDENTITY AND PAIR CONFLICT DISCLOSURE

A1 v1.0 §5.1 designates RT-07 as "Temporal Coherence Runtime" with primary role 
"Temporal ordering, sequence integrity." This designation is constitutionally incorrect 
per A0 v1.1 §3.8, which defines RT-07 as "Memory Runtime" with purpose of durable 
persistence, provenance chains, and historical state provision.

A0 v1.1 governs RT-07 identity. "Memory Runtime" is the canonical name.

Additionally, all 10 A1 v1.0 PAIRs involving RT-07 characterize RT-07's interactions 
as temporal attestation, temporal anchoring, or temporal ordering services. None of 
these functions appear in A0 §3.8's 12 responsibilities. The constitutionally correct 
PAIR characterizations, derived from A0 §3.8 and A0 cross-references, are specified 
in RS-13 below.

A1-AMEND-001 (expanded scope) or A1-AMEND-002 is initiated to correct:
- RT-07 identity in A1 §5.1 and §3.0
- All 10 A1 PAIRs (09, 13, 17, 21, 24, 26, 28, 37, 38, 39)
- A1 §5.1 AIR-1 temporal domain claim (removed)
- A1 §6.1/§7.1 Temporal Sequence Record (removed)
- Missing PAIR RT-07 ↔ RT-14 (added)

The PAIR characterizations below are derived from A0 §3.8 and are constitutionally 
correct regardless of the pending A1 amendment status.
```

---

## SECTION 3 — REQUIRED AFTER R7 SPECIFICATION

These steps occur after R7-v1.0-canonical.md is written but before or after certification.

---

### STEP A1: COMPLETE A1-AMEND-001 / A1-AMEND-002

**Action:** Complete the A1 amendment covering RT-07 corrections (all items from STEP 2 above). Produce A1-v1.1-canonical.md or equivalent versioned amendment document.

**Timing:** Should be completed and available by the time R7 goes to independent certification, so CERT-06 can be verified against correct A1 PAIRs.

**Note:** R7 specification may proceed and be written before A1 is amended. But the independent certification of R7 should either: (a) verify CERT-06 against the amended A1, or (b) certify R7 conditionally pending A1 amendment (as was done with R6 v1.0 certification).

---

### STEP A2: R6 RS-26 EDITORIAL CORRECTION (OPTIONAL)

**Action (optional):** R6 v1.1.1 RS-26 characterizes the RT-07 dependency as "Temporal ordering: RT-07 provides temporal attestation required by RT-06 for GCR-4..." This characterization is based on A1 PAIR 26 which is being corrected.

**Impact:** LOW. The R6 certification remains valid (the dependency on RT-07 is real; only the characterization is imprecise). An R6 v1.1.2 editorial maintenance release could correct this characterization without triggering re-certification.

**Timing:** After R7 is certified. Not on the critical path.

---

### STEP A3: R5 HISTORICAL NOTE

**Action (informational):** R5 v1.0 describes RT-07 as "Constitutional Temporal Runtime" throughout. This is an inherited A1 error. R5 is certified and will not be revised. Future documents that reference R5's RT-07 descriptions should note they reflect A1's prior incorrect characterization.

**No corrective action required.** Historical record of R5's temporal runtime characterization is preserved.

---

### STEP A4: R1 HISTORICAL NOTE

**Action (informational):** R1 v1.1 implements A1 PAIR 09 (RT-07 temporal attestation to RT-01) and describes RT-07 as "Constitutional Temporal Authority Runtime" in RS-27 (line 2162). These are inherited A1 errors. R1 is certified.

**No corrective action required** for the current certification. If R1 v1.2 is ever produced, RS-13 PAIR 09 and RS-27 RT-07 description should be corrected per RT07-PAIR-ADJUDICATION-REGISTER.md.

---

### STEP A5: R7 AUTHORIZATION OF R8

**Action:** Upon R7 receiving an independent certification verdict of PASS, R7 CERT-10 activates the R8 authorization per R0 convention.

**R8 identity:** Per A0 §3.9, R8 corresponds to RT-08 (Observation Runtime). Verify that A0 §3.9 defines RT-08 correctly and that A1 does not introduce a similar RT-08 identity conflict before beginning R8 specification.

---

## SECTION 4 — OPTIONAL FUTURE WORK

### Verify R8-R16 for A1 Identity Pattern

A1's pattern of renaming runtimes (RT-06 as "Event Stream Runtime", RT-07 as "Temporal Coherence Runtime") suggests A1 may have introduced similar errors for other runtimes. Before writing R8 through R16, each runtime's A0 §3.x definition should be compared against A1's §5.1 catalog for similar identity conflicts.

### A0 Internal Temporal Ambiguity Clarification

A0 §8.5 references "RT-07 temporal validity" in the Gate 6 context — this has been adjudicated as referring to temporal validity metadata on persisted objects (A0 §3.8 R7), not temporal attestation. If A0-v1.2 is ever produced, this language could be clarified to eliminate the ambiguity.

### D5 OPL and RT-07

A1 PAIR 28 cited D-5 §2.1 for the OPL Stage 2 temporal anchor function. D5 was not in the adjudication scope. D5 should be read when R8 (Observation Runtime) is specified to ensure the OPL Stage 2 → RT-07 interaction is correctly characterized from D5's perspective.

---

## CRITICAL PATH SUMMARY

```
[DONE] RT07-CONSTITUTIONAL-AUTHORITY-RESOLUTION.md
[DONE] RT07-PAIR-ADJUDICATION-REGISTER.md
[DONE] RT07-REMEDIATION-ROADMAP.md
[DONE] RT07-CONSTITUTIONAL-VERDICT.md

IMMEDIATE:
  ├── Initiate A1-AMEND-001 scope expansion (in parallel with R7 spec)
  ├── Read D6 Part 9 Memory domain coherence dimensions
  ├── Read A1 §15.2 RT-07 loop participation
  └── Read A0 §4.4 execution order RT-07 steps complete

THEN:
  └── Write R7-v1.0-canonical.md
       ├── RS-01: Memory Runtime, T2, A0 §3.8
       ├── RS-06: No AIR-N; D-series mandate authority
       ├── RS-13: Full A1 conflict disclosure + correct PAIR characterizations
       ├── RS-20: RT07-INV-1 through RT07-INV-5 + D-series invariants
       └── RS-36: CERT-10 (R8 authorization)

AFTER R7 CERTIFICATION:
  ├── Complete A1 amendment
  └── Optional R6 RS-26 editorial correction
```

---

*RT07 Remediation Roadmap completed: 2026-07-22*  
*Adjudicator: Constitutional Auditor (Claude Sonnet 4.6)*
