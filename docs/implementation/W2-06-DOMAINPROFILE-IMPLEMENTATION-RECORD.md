# W2-06 — DomainProfile Constitutional Integration: Implementation Record

**Task:** W2-06 — DomainProfile Constitutional Integration  
**Date:** 2026-07-29  
**Status:** VERIFIED  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Constitutional Runtime:** RT-15 (Domain Runtime)  
**Wiring Pattern:** Fire-and-forget V1.0 (W2-CONSTITUTIONAL-WIRING-PATTERN.md)

---

## 1. Files Created

| File | Purpose |
|------|---------|
| `tests/domain-profile-constitutional.test.js` | W2-06 constitutional test suite — 41 tests across 9 categories |
| `docs/implementation/W2-06-DOMAINPROFILE-BASELINE.md` | Phase 0 baseline and falsification report (decision B: IMPLEMENTABLE WITH LIMITATIONS) |
| `docs/implementation/W2-06-DOMAINPROFILE-IMPLEMENTATION-RECORD.md` | This record |

---

## 2. Files Modified

| File | Change |
|------|--------|
| `lib/registry/universe/index.js` | Added RT-15 DomainAuthorityRecord + DomainProfile emission inside inject() — fire-and-forget V1.0 pattern |
| `docs/implementation/WAVE-2-MIGRATION-LEDGER.md` | SS-07 Migration/Verification Status: NOT STARTED → VERIFIED; Files Involved corrected; SS-07 summary table updated |

---

## 3. Wiring Summary

**Wiring site:** `lib/registry/universe/index.js:inject()`

`inject()` is called once at startup via `lib/registry/index.js:48`. After the entity and edge injection loop, a `setImmediate(async () => { ... })` block iterates all 12 constitutional domains and emits one DomainAuthorityRecord and one DomainProfile per domain, writing each to `constitutionalStore` (MR-08 no-op stub in Wave 2).

**Wiring site correction:** The migration ledger listed `lib/empire/` as the target. Phase 0 falsification confirmed the empire graph contains no constitutional domain entities (node types: empire, project, business, person, capital, market, asset, resource, opportunity, threat, goal). The authoritative domain data source is `lib/registry/universe/domain-entities.js`. Correct wiring site: `lib/registry/universe/index.js`.

**Production call path:**
```
server.js → require('./lib/registry') → lib/registry/index.js:48 → universe.inject()
  → setImmediate fires → 12 × { DomainAuthorityRecord.create() + DomainProfile.create() }
```

---

## 4. Field Mapping Summary

### DomainAuthorityRecord (9 required fields)

| Field | Source | Honesty |
|-------|--------|---------|
| `dar_id` | `'dar-' + dom.id` (deterministic, matches DP.authority_record_ref) | DIRECTLY AVAILABLE |
| `domain_id` | `dom.id` | DIRECTLY AVAILABLE |
| `air_1_authority_holders` | `[]` | HONEST (RT-02 Wave 3 scope; _utils.js accepts empty arrays) |
| `air_2_authority_holders` | `[]` | HONEST (RT-02 Wave 3 scope) |
| `air_3_authority_holders` | `[]` | HONEST (RT-02 Wave 3 scope) |
| `air_4_authority_holders` | `[]` | HONEST (RT-02 Wave 3 scope) |
| `air_5_authority_holders` | `[]` | HONEST (RT-02 Wave 3 scope) |
| `air_compliance_status` | `'NOT_ESTABLISHED'` | HONEST (no holders assigned) |
| `last_updated_at` | `new Date().toISOString()` shared across loop | DIRECTLY AVAILABLE |

### DomainProfile (9 required fields)

| Field | Source | Honesty |
|-------|--------|---------|
| `domain_profile_id` | `'dp-' + dom.id` (deterministic) | DIRECTLY AVAILABLE |
| `domain_id` | `dom.id` | DIRECTLY AVAILABLE |
| `domain_name` | `dom.name` | DIRECTLY AVAILABLE |
| `reality_context` | `dom.description` | DIRECTLY AVAILABLE |
| `internal_representation` | `dom.purpose` | DIRECTLY AVAILABLE |
| `authority_record_ref` | `'dar-' + dom.id` (forward reference to co-emitted DAR) | HONEST (W2-03 certified pattern) |
| `knowledge_status` | `'NOT_ESTABLISHED'` | HONEST (RT-10 not yet wired) |
| `projection_status` | `'NOT_ESTABLISHED'` | HONEST (RT-13/RT-14 not yet wired) |
| `last_updated_at` | `new Date().toISOString()` shared across loop | DIRECTLY AVAILABLE |

**Field honesty: 9/9 for both types. No fabricated values.**

---

## 5. Emission Ordering Summary

Within each `setImmediate` iteration (per domain):
1. `DomainAuthorityRecord.create()` — writes DAR with `dar_id = 'dar-' + dom.id`
2. `constitutionalStore.write(dar)`
3. `DomainProfile.create()` — writes DP with `authority_record_ref = 'dar-' + dom.id`
4. `constitutionalStore.write(dp)`

DomainAuthorityRecord is always created before the DomainProfile that references it. Both `dar_id` and `authority_record_ref` are deterministic strings, so the forward reference is honest regardless of constitutionalStore Wave 2 no-op status.

**Total records per startup:** 24 (12 DomainAuthorityRecord + 12 DomainProfile)

---

## 6. Constitutional Limitations

| # | Limitation | Constitutional Basis | Resolution |
|---|-----------|---------------------|------------|
| L1 | AIR holder arrays are empty | D6 AIR-1..5 requires authority grants from RT-02; RT-02 is Wave 3 | Wave 3 RT-02 wiring; empty arrays are schema-valid per _utils.js |
| L2 | `air_compliance_status: NOT_ESTABLISHED` | Cannot assert compliance without holders | Wave 3 update when RT-02 wired |
| L3 | `knowledge_status: NOT_ESTABLISHED` | RT-10 (KnowledgeChain) not wired | Wave 3/4 KnowledgeChain wiring |
| L4 | `projection_status: NOT_ESTABLISHED` | RT-13/RT-14 (Projection) not wired | Wave 3/4 Projection wiring |
| L5 | constitutionalStore.write() is no-op | MR-08 stub in Wave 2; records not persisted | Wave 2 MR-08 activation |
| L6 | `authority_record_ref` is a forward reference string | DAR and DP created in same iteration; store is no-op; no cross-reference validation possible | Invariant maintained by deterministic ID scheme |
| L7 | 5 of 7 RT-15 types not wired (DomainActorProfileRegistry, DomainKnowledgeChain, DomainCoherenceAssessment, DomainFailureModeRecord, CrossDomainRelationshipRecord) | Prerequisites (RT-02, RT-10, RT-06 chain) not yet satisfied | Wave 3+ |

---

## 7. Tests Executed

### W2-06 constitutional test suite
`node tests/domain-profile-constitutional.test.js` → **41 passed, 0 failed**

Categories:
1. DomainAuthorityRecord.create() W2-06 field values — 8 tests
2. DomainAuthorityRecord field validation — 5 tests
3. DomainAuthorityRecord.validate() — 3 tests
4. DomainProfile.create() W2-06 field values — 9 tests
5. DomainProfile field validation — 2 tests
6. DomainProfile.validate() — 2 tests
7. 12-domain emission loop — 5 tests (all-12 loop, authority_record_ref consistency, 24-record count)
8. Module integrity — 6 tests
9. Fire-and-forget infrastructure — 1 async test

### Wave 2 constitutional regression suites (all PASS)

| Suite | Result |
|-------|--------|
| actor-profile-constitutional.test.js | 28/28 PASS |
| coherence-violation-constitutional.test.js | 33/33 PASS |
| gate6-constitutional.test.js | 26/26 PASS |
| governance-attestation-constitutional.test.js | 28/28 PASS |
| memory-gateway-constitutional.test.js | 29/29 PASS |
| petl-constitutional.test.js | 18/18 PASS |
| reality-fabric-constitutional.test.js | 34/34 PASS |
| runtime-integration.test.js | 28/28 PASS |
| phase0-acceptance.test.js | 10/10 PASS |
| evidence-hash-integrity.test.js | 15/15 PASS |
| canonical-json.test.js | PASS |
| r-0-5, r-0-6, r-1-a, r-1-b, r-1-c suites | PASS |

**0 new test failures introduced. Pre-existing failures unchanged.**

---

## 8. Migration Ledger Updates

| Entry | Before | After |
|-------|--------|-------|
| SS-07 Migration Status | NOT STARTED | VERIFIED |
| SS-07 Verification Status | NOT STARTED | VERIFIED |
| SS-07 Files Involved | lib/empire/ files listed | Corrected to lib/registry/universe/index.js |
| SS-07 Notes | Wave 2 task note only | Wiring details, correction note, test results added |
| SS-07 summary table | NOT STARTED | VERIFIED |

---

## 9. Final Recommendation

**W2-06 is VERIFIED. No certification blockers.**

DomainAuthorityRecord and DomainProfile are wired at the correct constitutional site with 9/9 honest fields for both types. The fire-and-forget V1.0 pattern is applied correctly. DAR precedes DP ordering is maintained. All 41 W2-06 tests pass. All Wave 2 regressions pass.

**Certification gate:** W2-06 may proceed to CERTIFIED status upon Wave 2 certification review. Limitations L1–L7 are Wave 3/4 scope — none block certification.

**Next authorized Wave 2 tasks:**
- W2-09 — CivilizationalDecisionProposal / DeliberationRecord (IDR anticipated per W2-05 precedent)
- W2-11 — ObservationRecord (D5 protocol absent — IDR likely)

---

*W2-06 implementation record issued: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0.*  
*Wiring pattern: CONSTITUTIONAL WIRING PATTERN V1.0 (W2-CONSTITUTIONAL-WIRING-PATTERN.md).*
