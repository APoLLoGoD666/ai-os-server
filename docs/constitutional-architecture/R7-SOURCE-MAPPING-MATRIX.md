# R7 SOURCE MAPPING MATRIX
## RT-07 Memory Runtime — Constitutional Source Requirements Matrix

**Document:** Pre-specification source mapping for R7-v1.0-canonical.md  
**Runtime:** RT-07 Memory Runtime  
**Constitutional seat:** A0 v1.1 §3.8  
**Prepared:** 2026-07-22

---

## HOW TO READ THIS MATRIX

Each row maps one R7 specification requirement to its authoritative source, the exact citation, and the implication for how R7 must handle that requirement. The STATUS column indicates whether the requirement is:

- **READY** — constitutional grounding is clear; content can be derived directly
- **CONFLICT** — source documents disagree; adjudication required before specification
- **GAP** — required source document not yet verified; must be read before specification
- **DESIGN DECISION** — no constitutional specification; R7 author must determine within constitutional constraints

---

## SECTION 1 — IDENTITY REQUIREMENTS

| Requirement | Source | Citation | Implication for R7 | Status |
|-------------|--------|----------|--------------------|--------|
| RT number | A0 v1.1 §3.8 | Line 741 | RT-07 — no ambiguity | READY |
| Canonical name | A0 v1.1 §3.8 | Line 741 | "Memory Runtime" — verbatim per R0 RS-01 requirement | READY |
| A1 name divergence | A1 v1.0 §5.1 | Line 183 | A1 calls RT-07 "Temporal Coherence Runtime" — must be disclosed in RS-13 | CONFLICT |
| R0 name in runtime table | R0 v1.0 | Line 1206 | R0 lists "Temporal Coherence Runtime" — R0's own RS-01 criterion requires verbatim A0 name; R0's table is internally inconsistent | CONFLICT |
| Tier designation | A0 v1.1 §3.1 | Line 366 | T2 — Reality Fabric Layer (with RT-05, RT-06) | READY |
| Constitutional seat | A0 v1.1 | §3.8 | A0 v1.1 §3.8 — explicitly derivable | READY |
| Founding actor convention | D4 v2.0 §13.4 | Line 820 | SEED-7 = "FoundingRatification" — a founding ceremony object, NOT a runtime actor; R7 must use same DEF-AUDIT-001 disclaimer as R6 v1.1.1 | READY |
| Authorization chain | R6 v1.1.1 CERT-10 | Lines 1174–1182 | Authorizes "RT-07 (Memory Runtime, A0 v1.1 §3.8)" — clean chain; no void identity issue | READY |

---

## SECTION 2 — AUTHORITY REQUIREMENTS

| Requirement | Source | Citation | Implication for R7 | Status |
|-------------|--------|----------|--------------------|--------|
| Primary D-series authority | A0 v1.1 §3.8 | Lines 744–745 | D-2 §XIII, D6 DOM-000004, D8 §5.7, D8 INV-2, D8 PROH-4, D8 PROH-5, D3 RF-A8 | READY (subject to D8 file verification) |
| D6 AIR-N authority type | A0 v1.1 §4.3 | Line 1986 | RT-07 NOT in A0 §4.3 authority graph; holds no D6 AIR-N type | READY |
| A1 AIR-1 temporal claim | A1 v1.0 §5.1 | Line 1120 | A1 claims RT-07 holds AIR-1 in temporal domain — constitutionally invalid (no A0 §4.3 grounding; D6 §4.3 prohibits infrastructure runtime AIR-N) | CONFLICT — must be explicitly denied in RS-06 |
| A0 §8.4 authority table | A0 v1.1 | Line 1986 | "Historical record preservation — RT-07 — D-2 §XIII, D8 §5.7" | READY |
| Authority derivation path | R0 ADR-1 through ADR-4 | Lines 150–180 | D-2 §XIII → D8 §5.7 → D3 RF-A8 → A0 v1.1 §3.8 → R0 → R7 v1.0; NOT via D6 AIR-N | READY |
| D-2 §XIII content | D-2 v1.2 | SOURCE-REGISTER S-1 | Conversation record only — content partially recoverable from A0 §2.12 and §3.8 citations | GAP |
| D6 DOM-000004 content | D6 v1.0 | Part 9 | D6 file exists; DOM-000004 (Memory domain) must be read for RS-14 domain coherence dimensions | GAP |
| D8 §5.7 content | D8 | §5.7 | D8 not in audit file list; partially recoverable from A0 §7.x D8 audit (lines 1879–1897) | GAP |
| D8 INV-2, PROH-4, PROH-5 | D8 | INV-2, PROH-4, PROH-5 | Same as above — A0 §7.x partially reconstructs these | GAP |

---

## SECTION 3 — OBJECT REQUIREMENTS

### 3A — Owned Objects

| Object | Source | Citation | Implication for R7 | Status |
|--------|--------|----------|--------------------|--------|
| HistoricalStateRecord | A0 v1.1 §3.8 | Line 761 | Owned by RT-07; created on any constitutional object persist | READY |
| ProvenanceChain | A0 v1.1 §3.8 | Line 761 | Owned by RT-07; append-only per RT07-INV-3 | READY |
| MemoryLifecycleRecord | A0 v1.1 §3.8 | Line 761 | Owned by RT-07; tracks Active → Archived lifecycle | READY |
| CollectiveMemoryReconciliationRecord | A0 v1.1 §3.8 | Line 761 | Owned by RT-07; created on domain memory divergence | READY |
| TemporalSequenceRecord (A1) | A1 v1.0 | Line 1170 | NOT in A0 §3.8 owned objects — cannot be included in RS-07 without adjudication | CONFLICT |

### 3B — Consumed Objects

| Object Source | Source | Citation | Implication for R7 | Status |
|--------------|--------|----------|--------------------|--------|
| All constitutional objects from all runtimes | A0 v1.1 §3.8 | Lines 762–763 | Universal consumption — RT-07 receives all objects for persistence | READY |
| All RT-03 Class B outputs (highest protection) | A0 v1.1 §3.8 | Responsibility 10 | CREs, CCRs, Kernel Stage 9 outputs — Class B = highest provenance protection | READY |
| RT-04 audit records (protected from modification) | A0 v1.1 §3.8 | Responsibility 11 | RT-07 persists RT-04 audit records; RT-04 records may not be modified by any other runtime | READY |
| Fabric state changes from RT-05 | A0 v1.1 §4.1 | Line 1263 | RT-05 → RT-07 direct pathway for fabric state changes | READY |
| Observed Consequence Records from RT-14 | A0 v1.1 §3.15 | Line 1091 | RT-14 → RT-03 → RT-05 → RT-07 | READY |
| Authority archive from RT-02 at era-close | R2 v1.0 | Line 786 | Direct at era-close (not via pipeline) | READY |
| Kernel Operation Log from RT-03 at era-close | R3 v1.0 | Line 797 | Direct at era-close | READY |

### 3C — Produced Objects

| Object | Source | Citation | Consumers | Status |
|--------|--------|----------|-----------|--------|
| HistoricalStateRecord (historical versions) | A0 v1.1 §3.8 | Lines 764–765 | RT-09, RT-10, RT-11, RT-04 | READY |
| ProvenanceChain segments | A0 v1.1 §3.8 | Lines 764–765 | RT-04, all runtimes | READY |
| HistoricalStateQueryResult | A0 v1.1 §3.8 | Lines 764–765 | RT-09 (line 855), RT-10 (line 898), RT-11 (line 944), RT-04 (line 606), RT-08 (line 808) | READY |
| Write confirmations | A0 v1.1 §3.8 | Line 768 | All sending runtimes | READY |

---

## SECTION 4 — DEPENDENCY REQUIREMENTS

### 4A — RT-07 Dependencies (outgoing — what RT-07 depends on)

| Dependency | Source | Citation | Nature | Status |
|-----------|--------|----------|--------|--------|
| RT-03 | A0 v1.1 §3.8 | Lines 777–778 | Memory writes are Kernel-processed; provenance records from RT-03 Stage 9 | READY |
| RT-05 | A0 v1.1 §3.8 | Lines 777–778 | Fabric state changes are primary source of memory writes | READY |

### 4B — RT-07 Dependents (incoming — what depends on RT-07)

| Dependent | Source | Citation | What They Receive | Status |
|-----------|--------|----------|------------------|--------|
| RT-09 | A0 v1.1 §3.8 | Line 779 | Historical Knowledge States | READY |
| RT-10 | A0 v1.1 §3.8 | Line 780 | Historical Understanding Models | READY |
| RT-11 | A0 v1.1 §3.8 | Line 780 | Historical CUMs and Deliberation Records | READY |
| RT-04 | A0 v1.1 §3.8 | Line 780 | All historical records for audit | READY |
| RT-08 | A0 v1.1 §3.9 | Line 808 | Historical state for contextualizing observations | READY |
| RT-14 | A0 v1.1 §3.15 | Lines 1085, 1101 | Historical Understanding Models for divergence context | READY |
| RT-02 (era-close) | R2 v1.0 | Line 784 | Historical authority archive | READY |

### 4C — A1 PAIR Mapping

| PAIR | Runtimes | A1 Function | A0 §3.8 Grounding | R7 Implication | Status |
|------|----------|------------|-------------------|----------------|--------|
| 09 | RT-01 ↔ RT-07 | RT-07 provides temporal sequence attestation | NONE in A0 §3.8 | Cannot adopt temporal attestation function without adjudication | CONFLICT |
| 13 | RT-02 ↔ RT-07 | RT-07 provides temporal context | NONE in A0 §3.8 | RT-02 era-close archive to RT-07 is correct; temporal context claim is not | PARTIAL CONFLICT |
| 17 | RT-03 ↔ RT-07 | Temporal attestation for Gate 6 (blocking); RT-03 registers timestamp | RT-03 commit → RT-07 persistence grounded; Gate 6 attestation NOT grounded | Split: persistence side ADOPTABLE; Gate 6 attestation side CONFLICT | PARTIAL CONFLICT |
| 21 | RT-04 ↔ RT-07 | RT-04 reads temporal records | RT-04 reads historical records (correct in A0) | Adopt as "RT-04 reads historical records" — temporal framing is A1 artifact | ADOPTABLE WITH REFRAME |
| 24 | RT-05 ↔ RT-07 | Temporal sequence validation; RT-05 registers timestamps | RT-05 → RT-07 persistence grounded; temporal validation NOT grounded | Adopt RT-05 → RT-07 persistence; reject temporal validation claim | PARTIAL CONFLICT |
| 26 | RT-06 ↔ RT-07 | RT-07 provides temporal ordering; RT-06 sends event sequence | NONE in A0 §3.8 | RT-06 CREs/CCRs → RT-07 persistence is correct routing but not "event sequence" | PARTIAL CONFLICT |
| 28 | RT-07 ↔ RT-08 | RT-07 provides temporal anchor for OPL Stage 2 | NONE in A0 §3.8 | Cannot adopt — temporal anchor function not in A0 §3.8 | CONFLICT |
| 37 | RT-07 ↔ RT-09 | RT-07 provides temporal anchoring for Evidence Records | A0 §3.8 says RT-09 queries RT-07 for Historical Knowledge States (DIFFERENT function) | A1 temporal grounding wrong direction — A0 shows RT-09 as consumer of RT-07 historical queries | CONFLICT (direction correct in A0; function wrong in A1) |
| 38 | RT-07 ↔ RT-10 | Same temporal pattern as PAIR 37 | Same as PAIR 37 | Same | CONFLICT |
| 39 | RT-07 ↔ RT-11 | Same temporal pattern | Same | Same | CONFLICT |

**Summary: 0 of 10 A1 PAIRs are fully adoptable without resolution. 2 have adoptable persistence-side content. 8 are wholly temporal-function interactions with no A0 §3.8 grounding.**

---

## SECTION 5 — INVARIANT REQUIREMENTS

| Invariant | Source | Citation | Content | Status |
|-----------|--------|----------|---------|--------|
| RT07-INV-1 | A0 v1.1 §3.8 | Line 771 | No historical record ever modified — append-only | READY |
| RT07-INV-2 | A0 v1.1 §3.8 | Line 772 | No historical record ever deleted — terminal state is Archived | READY |
| RT07-INV-3 | A0 v1.1 §3.8 | Line 773 | Provenance chains always complete and unbroken | READY |
| RT07-INV-4 | A0 v1.1 §3.8 | Line 774 | Accountability records and Class B outputs stored with highest provenance protection | READY |
| RT07-INV-5 | A0 v1.1 §3.8 | Line 775 | Memory closure is lifecycle event, not deletion — closed memory accessible to RT-04 | READY |
| D3 RF-A8 (Historical Inalienability) | D3 v1.0 | RF-A8 | No historical record altered or expunged | READY |
| D8 INV-2 (Provenance Preservation) | D8 (via A0 §7.x line 1891) | INV-2 | Every constitutional object carries complete, unbroken provenance chain | READY |
| D8 PROH-4 (No provenance suppression) | D8 (via A0 §7.x line 1893) | PROH-4 | Append-only enforcement | READY |
| D8 PROH-5 (No accountability record deletion) | D8 (via A0 §7.x line 1893) | PROH-5 | RT07-INV-2 enforcement | READY |
| D8 TI-3 (Relationship preservation) | D8 (via A0 §7.x line 1879) | TI-3 | RT-07 enforces this | READY |
| D8 TI-4 (Constraint preservation) | D8 (via A0 §7.x line 1879) | TI-4 | RT-07 enforces this | READY |

---

## SECTION 6 — R0 SECTION REQUIREMENTS

| R0 Section | Requirement | Source for R7 | Status |
|-----------|-------------|---------------|--------|
| RS-01 | Identity (4 required components) | A0 §3.8, R0 RS-01 specification | READY |
| RS-02 | Constitutional Basis | A0 §3.8, D-series | READY (subject to D8 verification) |
| RS-03 | Purpose statement | A0 §3.8 lines 742–743 (verbatim) | READY |
| RS-04 | Scope (in-scope and out-of-scope) | A0 §3.8 responsibilities; A0 §3.8 exclusions | READY for in-scope; CONFLICT for temporal exclusions |
| RS-05 | Obligations O7-1 through O7-12 | A0 §3.8 responsibilities 1–12 | READY |
| RS-06 | Authority | A0 §3.8; A0 §4.3; D-series mandate | READY (no AIR-N); CONFLICT (A1 AIR-1 must be denied) |
| RS-07 | Owned Objects | A0 §3.8 line 761 | READY |
| RS-08 | Inputs | A0 §3.8 lines 766–767 | CONFLICT — A1 temporal attestation request inputs not in A0 |
| RS-09 | Outputs | A0 §3.8 lines 768–769 | CONFLICT — A1 temporal attestation outputs not in A0 |
| RS-10 | Object Type specifications | A0 §3.8 lines 761–769 | READY for A0 objects; CONFLICT for A1 TemporalSequenceRecord |
| RS-11 | Coherence Rules | D3 §4 GCRs applicable to memory | GAP — must derive which GCRs apply to RT-07 specifically |
| RS-12 | Execution Procedure | A0 §4.4 steps 5, 14, 31 | DESIGN DECISION — steps require elaboration |
| RS-13 | External Interactions (A1 PAIRs) | A1 §5.1 — all 10 PAIRs | CONFLICT — see Section 4C above |
| RS-14 | Domain Coherence | D6 Part 9 — Memory domain | GAP — D6 Part 9 must be read for Memory domain dimensions |
| RS-15 | Civilization Coherence | D7 Part 9 | GAP — D7 Part 9 must be read for applicable dimensions |
| RS-16 | Constitutional Loops | A1 §15.2 | GAP — A1 §15.2 RT-07 loop participation not extracted |
| RS-17 | Object Lifecycle | A0 §3.8 responsibility 6; RT07-INV-2 | READY |
| RS-18 | State Machine | Not specified in A0 | DESIGN DECISION |
| RS-19 | Error Handling | Not specified in A0 | DESIGN DECISION (within RT07-INV bounds) |
| RS-20 | Invariants | RT07-INV-1 through RT07-INV-5; D-series invariants | READY |
| RS-21 | Prohibited Behaviors | D8 PROH-4/5; D3 RF-A8; A0 §8.3 | READY |
| RS-22 | Translation Interface | D8 TI-3, TI-4 confirmed; TI-1, TI-2, TI-5 need verification | PARTIAL GAP |
| RS-23 | Security | RT-07 Class B highest protection; RT-04 record protection | READY |
| RS-24 | Performance | Not specified in A0 | DESIGN DECISION |
| RS-25 | Implementation Independence | R0 CERT-09 standard | STANDARD |
| RS-26 | Dependencies | A0 §3.8 lines 777–778 | READY (RT-03, RT-05) |
| RS-27 | Dependents | A0 §3.8 lines 779–780; cross-references | READY |
| RS-28 | Constitutional Stage | A0 §4.4 steps 5, 14, 31; post-Stage 9 persistence | GAP — stage participation map incomplete |
| RS-29 | Loop Participation | A1 §15.2 | GAP |
| RS-30 | Execution Order | A0 §4.4 | GAP — full execution order not extracted |
| RS-31 | Stage Ownership | RT-07 does not own a stage per A0 | READY (no stage ownership) |
| RS-32 | Escalation | Not specified in A0 | DESIGN DECISION |
| RS-33 | Translation Audit (D8 TI-1–5) | D8 (via A0 §7.x) | PARTIAL — TI-3, TI-4 confirmed; others need verification |
| RS-34 | Audit Interface | A0 §3.8 responsibility 9 | READY |
| RS-35 | Prohibited Responsibilities | A0 §8.3; scope exclusions | CONFLICT — temporal ordering prohibition pending adjudication |
| RS-36 | CERT-10 (R8 Authorization) | R0 standard | DESIGN DECISION — verify A0 §3.9 is RT-08 for chain |

---

## SECTION 7 — CONFLICT SUMMARY TABLE

| Conflict ID | Sections Affected | Conflicting Sources | Resolution Path |
|------------|-------------------|--------------------|----|
| CONF-001 | RS-01, RS-03, RS-04, RS-06 | A0 §3.8 (Memory Runtime) vs A1 §5.1 (Temporal Coherence Runtime) | Adjudication — A0 is authoritative; A1 identity disclosure required |
| CONF-002 | RS-06 | A0 §4.3 (no RT-07 authority) vs A1 §5.1 (AIR-1 temporal domain) | RS-06 must deny AIR-1; disclose A1 error |
| CONF-003 | RS-08, RS-09 | A0 §3.8 inputs/outputs vs A1 temporal attestation I/O | Adjudication — cannot adopt temporal I/O without A0 grounding |
| CONF-004 | RS-10 | A0 §3.8 owned objects vs A1 TemporalSequenceRecord | TemporalSequenceRecord excluded unless adjudicated |
| CONF-005 | RS-13 (all 10 PAIRs) | A0 §3.8 memory functions vs A1 temporal PAIRs | CRITICAL — CERT-06 cannot pass; requires full A1 PAIR adjudication |
| CONF-006 | RS-35 | Temporal ordering prohibited (not in A0 §3.8) — but A0 §8.5 references "RT-07 temporal validity" | Requires resolution of A0 internal ambiguity |

---

## SECTION 8 — GAPS REQUIRING PRE-SPECIFICATION RESEARCH

| Gap ID | Description | Documents to Read | Blocking? |
|--------|-------------|-------------------|-----------|
| GAP-01 | D8 canonical file not confirmed or read | D8-v1.0-canonical.md (or equivalent) | HIGH — D8 is primary authority for RT-07 |
| GAP-02 | D6 DOM-000004 content not read | D6-v1.0-canonical.md Part 9 §9.x (Memory domain dimensions) | MEDIUM — needed for RS-14 |
| GAP-03 | D7 Part 9 civilization coherence dimensions | D7-v1.0-canonical.md Part 9 | MEDIUM — needed for RS-15 |
| GAP-04 | A1 §15.2 RT-07 loop participation | A1-v1.0-canonical.md §15.2 | MEDIUM — needed for RS-16, RS-29 |
| GAP-05 | A0 §4.4 full execution sequence for RT-07 | A0-v1.1-canonical.md §4.4 | MEDIUM — needed for RS-28, RS-30 |
| GAP-06 | D8 TI-1, TI-2, TI-5 applicability to RT-07 | D8 or A0 §7.x D8 audit | MEDIUM — needed for RS-22, RS-33 |
| GAP-07 | D-2 §XIII full content | Conversation record (SOURCE-REGISTER S-1) | LOW — content partially recoverable from A0 citations |
| GAP-08 | Scope of A1-AMEND-001 relative to RT-07 | RT06-REMEDIATION-PLAN.md; pending A1 amendment | LOW |

---

*R7 Source Mapping Matrix completed: 2026-07-22*  
*Constitutional Auditor (Claude Sonnet 4.6)*
