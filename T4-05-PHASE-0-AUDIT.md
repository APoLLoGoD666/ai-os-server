# T4-05 Phase 0 Audit — DOM-000001 Operationalization Investigation

**Task:** T4-05  
**Phase:** 0 — Authoritative Investigation (required before any implementation)  
**Date:** 2026-08-20  
**Wave:** APEX — WAVE 4  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Investigator:** APEX AI OS — Claude Code (claude-sonnet-4-6)

---

## Absolute Rule Compliance

T4-05 specification includes:

> **ABSOLUTE RULE: DO NOT IMPLEMENT FROM THIS PROMPT ALONE.** Complete Phase 0 (authoritative investigation) before writing any code. The prompt is the brief, not the specification.

Phase 0 investigation was completed in full before any implementation. This document is the output of that investigation.

---

## 1. Authoritative Specification Source

**File:** `docs/implementation/WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md` §8 T4-05

| Field | Value |
|-------|-------|
| Task ID | T4-05 |
| Purpose | Make DOM-000001 executable — move from declared to operationally active; wire DomainProfile to constitutional decision pipeline |
| Inputs | DOM-000001 DomainProfile (W2-06 certified); CivilizationalDecision from Wave 3; AuditRecord (T4-04) |
| Outputs | DOM-000001 executable configuration; DomainProfile wired to RT-12 decision filter; T4-05-PHASE-0-AUDIT.md |
| Runtime | RT-05 Domain Runtime (notation) — actual seat: RT-15 §3.16 (same off-by-one artifact as T4-01 through T4-04) |
| Bootstrap limitations | L-T4-05-01: DOM-000001 operationalization scoped to constitutional_records decision filtering only; full domain governance deferred |
| Constitutional authority | A0-v1.1.1 §3.5 (notation) — actual: A0-v1.1.1 §3.16; W2-06 certification; DOM-000001 declaration |

**Off-by-one notation finding:** The roadmap cites "RT-05 §3.5" for Domain Runtime. The canonical source is `lib/constitutional-types/domain-profile.js` which cites `A0-v1.1.1 §3.16` as the constitutional seat (RT-15). This is the same off-by-one artifact documented across T4-01 through T4-04.

---

## 2. Pre-Existing Infrastructure Survey

### 2.1 DOM-000001 DomainProfile — W2-06 Baseline

**File:** `docs/implementation/W2-06-DOMAINPROFILE-BASELINE.md`

Key findings:
- DomainProfile for DOM-000001 (`dp-DOM-000001`) was certified at W2-06
- Written by `lib/registry/universe/index.js:inject()` at server startup
- `inject()` emits 12 DomainAuthorityRecord + 12 DomainProfile objects (24 records total) via fire-and-forget `setImmediate` block
- DOM-000001 is the Civilisation domain: `description: "The root domain — the living system as a whole. Parent of all other domains."`
- Status: ACTIVE, classification: CRITICAL
- DomainProfile contains 9/9 honest fields; 7 LOW-severity limitations (L1-L7)
- No DomainOperationalizationRecord type exists anywhere in the codebase

**Wiring site confirmed:** `lib/registry/universe/index.js:inject()` — NOT `lib/empire/` as might be assumed.

### 2.2 Constitutional Type Schema Survey

**File:** `lib/constitutional-types/domain-profile.js`

| Type | Relevant to T4-05 |
|------|------------------|
| DomainProfile | YES — dp-DOM-000001 already written by W2-06 |
| DomainAuthorityRecord | NO — already written by W2-06 |
| DomainActorProfileRegistry | NO — Phase 2 prerequisite |
| DomainKnowledgeChain | NO — Phase 2 prerequisite |
| DomainCoherenceAssessment | NO — Phase 2 prerequisite |
| DomainFailureModeRecord | NO — out of scope |
| CrossDomainRelationshipRecord | NO — out of scope |

**Finding:** No `DomainOperationalizationRecord` type exists. T4-05 must use raw record pattern (same as T3-12 `ConstitutionalDecisionRegistryEntry`).

### 2.3 L-DR-03 Limitation Identification

**File:** `lib/civilization/deliberation-registry.js`

At T3-12 bootstrap, DOM-000001 is in the deliberation participants array with status `NOT-OPERATIONAL`:

```js
{
    runtime: 'DOM-000001',
    role: 'Root Domain',
    status: 'NOT-OPERATIONAL',
    note: 'L-DR-03: DOM-000001 not operational as deliberation participant at bootstrap',
}
```

**L-DR-03 text:** "DOM-000001 not operational as deliberation participant at T3-12 bootstrap."

This is the specific limitation T4-05 must resolve. "DomainProfile wired to RT-12 decision filter" = upgrading DOM-000001 participant status from `NOT-OPERATIONAL` → `OPERATIONAL` in the deliberation participants array.

### 2.4 RT-15 Canonical Specification

**File:** `docs/constitutional-architecture/R15-v1.0-canonical.md`

Key findings:
- RS-34.2 (D8 §9.9 MVCS): Phase 2 prerequisites before full RT-15 activation: RT-05, RT-06, RT-07 operational. Bootstrap scope is justified.
- RS-13.3 PAIR 53: RT-15 ↔ RT-12 bidirectional interaction: "RT-15 → RT-12: Domain Runtime reports domain compliance status; RT-12 integrates for civilizational compliance picture."
- RT15-INV-1: DomainProfile NEVER DELETED — T4-05 must not delete or modify dp-DOM-000001
- RT15-PROH-07: No unassigned execution — operationalization must be by founding authority
- RT15-PROH-08: No hidden authority pathways — authority must be documented in constitutional_records

### 2.5 T4-04 AuditRecord Reference

Per T4-05 spec: AuditRecord (T4-04) is an input. T4-04 produced `ConstitutionalAuditRecord` with `carId = CAR-RT04-BOOTSTRAP-v1-{timestamp}`. The carId is timestamp-based and not predictable at T4-05 bootstrap call time.

**Finding (L-T4-05-02):** `audit_record_ref` must be declared by reference pattern (`CAR-RT04-BOOTSTRAP`) rather than by exact carId.

---

## 3. Operationalization Semantics Determination

### 3.1 What "DOM-000001 Operationalization" Means

From Phase 0 investigation, "operationalization" means exactly two things:

**Output 1 — DOM-000001 executable configuration:**
A `DomainBootstrapOperationalizationRecord` written to `constitutional_records` attesting that DOM-000001's DomainProfile is accepted as an operational participant in the constitutional decision pipeline. This is the "executable configuration" because it creates a constitutional record binding DOM-000001 to the RT-12 decision pipeline.

**Output 2 — DomainProfile wired to RT-12 decision filter:**
`deliberation-registry.js` upgraded to:
1. Import `formDom000001Operationalization` from new `dom000001-bootstrap.js`
2. Call it during `formDeliberationAndDecision()` to obtain `domOperRef`
3. Pass `domOperRef` to `_buildDrParticipants(cmId, domOperRef)`
4. When `domOperRef` present: DOM-000001 participant status = `OPERATIONAL`
5. When `domOperRef` absent: DOM-000001 participant status = `NOT-OPERATIONAL` (backward-compatible, L-DR-03 preserved)

### 3.2 What "Operationalization" Does NOT Mean

Phase 0 investigation ruled out the following as T4-05 scope:
- Full RT-15 domain governance activation (blocked by RS-34.2 Phase 2 prerequisites)
- DomainCoherenceAssessment production (W2-06 L7 — not yet)
- DomainKnowledgeChain formation (W2-06 L7 — not yet)
- DomainActorProfileRegistry creation (W2-06 L7 — not yet)
- RT-02 authority grants for DOM-000001 (L-T4-05-03 — Wave 3 scope not complete)
- Modifying or deleting dp-DOM-000001 (RT15-INV-1 prohibits this)

---

## 4. Implementation Decision Record

### 4.1 New File: `lib/civilization/dom000001-bootstrap.js`

**Decision:** Create new module following the T4-02 rt11-bootstrap.js pattern.

**Record type:** `DomainBootstrapOperationalizationRecord` (raw record, no formal constitutional-type schema — follows T3-12 ConstitutionalDecisionRegistryEntry precedent).

**Key fields determined in Phase 0:**
- `__type`: `DomainBootstrapOperationalizationRecord`
- `__runtime`: `RT-15` (canonical seat per §3.16)
- `__wave`: `W4-T4-05`
- `__structural_immutable`: `false` (updated when L-T4-05-01 through L-T4-05-04 resolved)
- `domain_id`: `DOM-000001`
- `domain_profile_ref`: `dp-DOM-000001` (W2-06 certified)
- `operationalization_level`: `BOOTSTRAP-DECISION-FILTER` (L-T4-05-01 scoped)
- `audit_record_ref`: `CAR-RT04-BOOTSTRAP` (declared by reference, L-T4-05-02)
- Duplicate guard: `_emitted` Set keyed on `drId` (same pattern as T4-02, T4-03, T4-04)

### 4.2 Modified File: `lib/civilization/deliberation-registry.js`

**Decision:** Four minimal surgical changes — no rewrite.

1. Update L-DR-03 header comment to document resolution path
2. Add import: `const { formDom000001Operationalization } = require('./dom000001-bootstrap')`
3. Update `_buildDrParticipants` signature from `(cmId)` → `(cmId, domOperRef)` with backward-compatible DOM-000001 status logic
4. Add T4-05 call in `formDeliberationAndDecision()` before participants are built

**Backward-compatibility confirmed:** `_buildDrParticipants()` with no arguments → DOM-000001 remains `NOT-OPERATIONAL` (L-DR-03 original behavior preserved for all prior tests).

### 4.3 Limitations Documented

| Limitation | Source | Status |
|------------|--------|--------|
| L-T4-05-01 | R15-v1.0-canonical.md RS-34.2 | Bootstrap scope only; full RT-15 deferred |
| L-T4-05-02 | T4-04 carId timestamp-based | audit_record_ref declared by reference |
| L-T4-05-03 | W2-06 L1 | AIR authority arrays empty |
| L-T4-05-04 | W2-06 L7 | DomainCoherenceAssessment/DomainKnowledgeChain/DomainActorProfileRegistry deferred |

---

## 5. Phase 0 Completeness Checklist

| Item | Status |
|------|--------|
| WAVE-4 roadmap T4-05 section read | DONE |
| R15-v1.0-canonical.md read (RS-34.2, PAIR 53, INV-1, PROH-07, PROH-08) | DONE |
| W2-06-DOMAINPROFILE-BASELINE.md read | DONE |
| lib/constitutional-types/domain-profile.js read | DONE |
| lib/registry/universe/index.js read (W2-06 wiring site) | DONE |
| lib/civilization/deliberation-registry.js read (L-DR-03 identified) | DONE |
| Off-by-one artifact documented (RT-05 → RT-15) | DONE |
| Bootstrap scope boundary established (L-T4-05-01) | DONE |
| Operationalization semantics determined (2 outputs, scope boundary) | DONE |
| Raw record pattern justified (no DomainOperationalizationRecord type) | DONE |
| audit_record_ref limitation documented (L-T4-05-02) | DONE |
| Backward-compatibility strategy confirmed | DONE |

---

## 6. Phase 0 Verdict

**PROCEED.** Investigation is complete. Implementation scope is bounded and justified. No spec ambiguity remains.

The two required outputs are:
1. `lib/civilization/dom000001-bootstrap.js` — new module producing `DomainBootstrapOperationalizationRecord`
2. `lib/civilization/deliberation-registry.js` — four surgical changes to wire `domOperRef` into participant status

All constitutional limitations documented. All Phase 2 deferral decisions justified by RS-34.2. Implementation may proceed.
