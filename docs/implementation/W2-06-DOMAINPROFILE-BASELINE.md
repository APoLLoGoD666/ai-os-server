# W2-06 DomainProfile Phase 0 Baseline

**Task:** W2-06 — DomainProfile / DomainAuthorityRecord Constitutional Integration  
**Date:** 2026-07-29  
**Phase:** 0 (Discovery / Field Honesty Assessment)  
**Constitutional types:** `DomainAuthorityRecord`, `DomainProfile` (RT-15)  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Decision:** B — IMPLEMENTABLE WITH LIMITATIONS

---

## 1. EXECUTIVE SUMMARY

W2-06 is constitutionally implementable in Wave 2. Both target types — `DomainAuthorityRecord` and `DomainProfile` — achieve 9/9 honest field satisfaction from data that exists in the repository today.

**Critical wiring site correction:** The migration ledger listed `lib/empire/graph.js`, `lib/empire/health.js`, `lib/empire/index.js` as target files. The empire module is a world model for the founder's external enterprise (projects, businesses, capital, threats, people). It contains no constitutional domain entities. The 12 constitutional domains (DOM-000001 through DOM-000012) are defined in `lib/registry/universe/domain-entities.js`. The correct wiring site is `lib/registry/universe/index.js:inject()`, confirmed in production at `lib/registry/index.js:48`.

No IDR required. Seven LOW-severity limitations identified, all with Wave 3 resolution paths. None block Wave 2 certification.

**Decision: B — IMPLEMENTABLE WITH LIMITATIONS**

---

## 2. REPOSITORY OBSERVATIONS

### 2.1 Wiring Site Discovery

| Assumption | Finding | Status |
|-----------|---------|--------|
| Wiring site is `lib/empire/` | FALSIFIED | `lib/empire/` contains external world graph only |
| Constitutional domains are in empire layer | FALSIFIED | Domains are in `lib/registry/universe/domain-entities.js` |
| `routes/empire.js` has domain registration | FALSIFIED | Zero domain/DOM-* matches in routes/empire.js |
| Wiring site is `lib/registry/universe/inject()` | CONFIRMED | `universe.inject()` called at `lib/registry/index.js:48` |

### 2.2 Empire Module Assessment

`lib/empire/graph.js` — Empire Graph Service. Node types: `empire`, `project`, `business`, `person`, `capital`, `market`, `asset`, `resource`, `opportunity`, `threat`, `goal`. No constitutional domain types. No DOM-* identifiers. Not a valid wiring site.

`lib/empire/health.js` — 7-dimension empire health scorer. Dimensions: `capital`, `momentum`, `risk`, `opportunity`, `people`, `assets`, `execution`. No constitutional domain structure. Not a valid wiring site.

### 2.3 Confirmed Domain Data Source

`lib/registry/universe/domain-entities.js` — Defines all 12 constitutional domains:

| ID | Name | status | criticality |
|----|------|--------|-------------|
| DOM-000001 | Civilisation | ACTIVE | CRITICAL |
| DOM-000002 | Intelligence | ACTIVE | CRITICAL |
| DOM-000003 | Registry | ACTIVE | CRITICAL |
| DOM-000004 | Memory | ACTIVE | HIGH |
| DOM-000005 | Infrastructure | ACTIVE | CRITICAL |
| DOM-000006 | Observability | ACTIVE | HIGH |
| DOM-000007 | Interface | ACTIVE | HIGH |
| DOM-000008 | Knowledge | ACTIVE | MEDIUM |
| DOM-000009 | Development | ACTIVE | HIGH |
| DOM-000010 | Experiments | ACTIVE | LOW |
| DOM-000011 | Reality Architecture | ACTIVE | CRITICAL |
| DOM-000012 | Theory of Change | ACTIVE | HIGH |

Each entry carries: `id`, `name`, `family`, `type`, `description`, `purpose`, `status`, `criticality`, `owner`, `_domain_key`, `_synthetic`.

### 2.4 Production Call Path — VERIFIED

```
lib/registry/index.js (line 48):
    universe.inject();        ← called at module-load time (synchronous, singleton)
    
lib/registry/universe/index.js:inject():
    engine.inject(allEntities)     ← DOMAINS + agents + services
    rels.add(...)                  ← inter-domain edges
    [WIRING POINT: fire-and-forget RT-15 emission goes here]
```

`lib/registry/universe/index.js` loads cleanly: `node -e "require('./lib/registry/universe/index')"` → PASS

### 2.5 Import Path Verification

From `lib/registry/universe/index.js`:
```
require('../../constitutional-types/domain-profile')
  → lib/constitutional-types/domain-profile.js   ✓ (file exists, confirmed)

require('../../runtime/constitutional-store')
  → lib/runtime/constitutional-store.js          ✓ (path resolves: confirmed via node -e)
```

`node -e "require('./lib/runtime/constitutional-store')"` → PASS

### 2.6 Schema Validation Behavior (_utils.js)

```javascript
// _utils.js lines 39-41 — array field validation
if (spec.type === 'array') {
    if (!Array.isArray(value)) {
        errors.push(`${field}: expected array, got ${typeof value}`);
    }
}
```

**Critical finding:** `required: true, type: 'array'` only checks `Array.isArray(value)`. An empty array `[]` is NOT absent (`undefined`/`null`). Empty arrays are schema-valid for all required array fields. This is the authoritative basis for the AIR holder array assessment in §3.

---

## 3. FIELD HONESTY MATRIX

### 3.1 DomainAuthorityRecord (9 required fields)

| # | Field | Classification | Wave 2 Value | Evidence |
|---|-------|---------------|--------------|---------|
| 1 | `dar_id` | DIRECTLY AVAILABLE | `'dar-' + dom.id` (e.g. `'dar-DOM-000001'`) | Deterministic from `dom.id`; stable, unambiguous |
| 2 | `domain_id` | DIRECTLY AVAILABLE | `dom.id` (e.g. `'DOM-000001'`) | Direct from domain-entities.js DOMAINS array |
| 3 | `air_1_authority_holders` | DIRECTLY AVAILABLE (empty) | `[]` | No D6 AIR-1 holders assigned; RT-02 not wired; empty array is schema-valid per _utils.js:39-41; accurately represents current system state |
| 4 | `air_2_authority_holders` | DIRECTLY AVAILABLE (empty) | `[]` | Same as air_1 — RT-02 Wave 3 scope |
| 5 | `air_3_authority_holders` | DIRECTLY AVAILABLE (empty) | `[]` | Same as air_1 |
| 6 | `air_4_authority_holders` | DIRECTLY AVAILABLE (empty) | `[]` | Same as air_1 |
| 7 | `air_5_authority_holders` | DIRECTLY AVAILABLE (empty) | `[]` | Same as air_1 — AIR-5 is audit independence; no audit holder assigned |
| 8 | `air_compliance_status` | DERIVABLE | `'NOT_ESTABLISHED'` | Synthesized from all-empty AIR arrays; no enum constraint; accurately states compliance cannot be assessed without authority holders |
| 9 | `last_updated_at` | DIRECTLY AVAILABLE | `new Date().toISOString()` | System time at emission; real timestamp |

**DomainAuthorityRecord: 9/9 fields honest (100%)**

#### Classification justification — AIR arrays

D6 AIR-1 through AIR-5 are Authority Independence Requirements. Base authority grants are RT-02 property; RT-02 is SS-10 (Wave 3 scope). No base authority grants exist anywhere in the current APEX production codebase.

`air_1_authority_holders: []` is HONEST — it accurately states "zero D6 AIR-1 authority holders have been constitutionally assigned to this domain." This is the factual state. The alternative — fabricating holder identifiers — would be dishonest.

`_utils.js` lines 39-41 confirm `[]` passes schema validation. The `required: true` check only prevents `undefined`/`null` — it does not require non-empty.

RT15-INV-3 ("domain authority assignments must be current and complete"): interpreted in Wave 2 context as "accurately represent current assignments." The constitutional note for DomainAuthorityRecord references RT15-INV-3 specifically in the context of `last_updated_at` tracking, not minimum population. Emitting empty arrays in Wave 2 and populating via RT-02 in Wave 3 is the constitutionally honest progression.

---

### 3.2 DomainProfile (9 required fields)

| # | Field | Classification | Wave 2 Value | Evidence |
|---|-------|---------------|--------------|---------|
| 1 | `domain_profile_id` | DIRECTLY AVAILABLE | `'dp-' + dom.id` (e.g. `'dp-DOM-000001'`) | Deterministic from `dom.id`; stable, unambiguous |
| 2 | `domain_id` | DIRECTLY AVAILABLE | `dom.id` (e.g. `'DOM-000001'`) | Direct from domain-entities.js DOMAINS array |
| 3 | `domain_name` | DIRECTLY AVAILABLE | `dom.name` (e.g. `'Civilisation'`) | Direct from DOMAINS entry; authoritative name |
| 4 | `reality_context` | DIRECTLY AVAILABLE | `dom.description` | domain-entities.js `description` IS the domain's reality context — what external reality segment it governs per D2 Layer 1 |
| 5 | `internal_representation` | DERIVABLE | `dom.purpose` | domain-entities.js `purpose` is the RT-15 initial internal representation — the system's authoritative statement of the domain's function |
| 6 | `authority_record_ref` | DERIVABLE (forward ref) | `'dar-' + dom.id` | Deterministic reference to co-emitted DomainAuthorityRecord; W2-03 CERTIFIED forward reference precedent (`historical_anchor_ref: 'ANCHOR-${claimId}'`) |
| 7 | `knowledge_status` | DERIVABLE | `'NOT_ESTABLISHED'` | No RT-10 DomainUnderstandingModel wired; string field, no enum; accurately represents no knowledge assessment exists yet |
| 8 | `projection_status` | DERIVABLE | `'NOT_ESTABLISHED'` | No RT-13/RT-14 projection objects wired; string field, no enum; accurately represents no projection assessment exists yet |
| 9 | `last_updated_at` | DIRECTLY AVAILABLE | `new Date().toISOString()` | System time at emission; real timestamp |

**DomainProfile: 9/9 fields honest (100%)**

---

## 4. DEPENDENCY GRAPH

```
DomainAuthorityRecord (RT-15)
        │
        │ dar_id  →  DomainProfile.authority_record_ref
        ▼
DomainProfile (RT-15)
```

### 4.1 Dependency Assessment

| Question | Finding |
|---------|---------|
| Does DomainAuthorityRecord depend on DomainProfile? | NO |
| Does DomainProfile depend on DomainAuthorityRecord? | YES — authority_record_ref requires DomainAuthorityRecord.dar_id |
| Is there a circular dependency? | NO — unidirectional: DAR → DP only |
| Can authority_record_ref be populated honestly? | YES — forward reference `'dar-' + dom.id` is deterministic and unambiguous |
| Does any required field require an unimplemented runtime? | RT-02 (AIR arrays) — satisfied by honest empty arrays in Wave 2 |
| Does any field require a future constitutional type? | NO — no RT-09, RT-10, RT-12, RT-13 type references required in Wave 2 values |

### 4.2 Forward Reference Resolution

`DomainProfile.authority_record_ref = 'dar-' + dom.id`

Both DomainAuthorityRecord.dar_id and DomainProfile.authority_record_ref are computed from the same `dom.id` in the same `setImmediate` block. The reference is deterministic without a DB round-trip.

**Precedent:** W2-03 (CERTIFIED) uses identical pattern: `historical_anchor_ref: 'ANCHOR-' + claimId` — a forward reference to a co-emitted type, valid under Wave 2 no-op store.

**Wave 3 constraint:** When constitutional store writes to real DB, DomainAuthorityRecord must be committed before DomainProfile references its dar_id. This is documented as L-02.

### 4.3 Emission Ordering

```
setImmediate(async () => {
    for each dom in DOMAINS:
        1. DomainAuthorityRecord.create({ dar_id: 'dar-'+dom.id, ... })
        2. constitutionalStore.write(dar)
        3. DomainProfile.create({ ..., authority_record_ref: 'dar-'+dom.id, ... })
        4. constitutionalStore.write(dp)
})
```

Ordering is intra-setImmediate per domain iteration. No async gap between DAR and DP within each iteration (both awaits are no-ops in Wave 2). Ordering constraint satisfied.

---

## 5. CONSTITUTIONAL BLOCKERS

| # | Potential Blocker | Assessment | Verdict |
|---|-----------------|------------|---------|
| B-01 | RT-02 not wired — AIR holder arrays cannot be populated with real references | Empty arrays are schema-valid (\_utils.js:39-41) and HONEST (accurately represent pre-authority state) | NOT A BLOCKER — Wave 2 limitation L-01 |
| B-02 | authority_record_ref requires prior DomainAuthorityRecord write | Forward reference is deterministic; Wave 2 store is no-op; W2-03 precedent | NOT A BLOCKER — Wave 2 limitation L-02 |
| B-03 | RT15-INV-3 "current and complete" — could require non-empty AIR arrays | Constitutional note ties RT15-INV-3 to last_updated_at tracking, not minimum population; Wave 2 bootstrap state is legitimately empty | NOT A BLOCKER — ambiguity resolved in favour of Wave 2 feasibility |
| B-04 | inject() is a singleton — re-emission on state change not possible | DomainProfile/DomainAuthorityRecord are "one per domain" root objects; one-time emission is constitutionally appropriate for bootstrap records | NOT A BLOCKER — Wave 2 limitation L-06 |
| B-05 | knowledge_status / projection_status — no source data | No enum constraint; 'NOT_ESTABLISHED' is schema-valid and honest | NOT A BLOCKER — Wave 2 limitation L-03, L-04 |
| B-06 | Import paths from lib/registry/universe/ not verified | node -e path resolution confirmed; both paths resolve correctly | NOT A BLOCKER — verified |

**Zero blocking constraints identified.**

---

## 6. IDR ASSESSMENT

**NO IDR REQUIRED.**

### 6.1 Falsification Attempts

| Assumption | Falsification attempt | Result |
|-----------|----------------------|--------|
| W2-06 belongs in Wave 2 | Sought field that requires Wave 3-only type | FAILED TO FALSIFY — all fields satisfy with Wave 2 data |
| W2-06 has no hidden RT dependencies | Examined AIR arrays — requires RT-02 authority grants | PARTIALLY FAILED — limitation only; empty arrays are honest in Wave 2 |
| W2-06 is independent of W2-07 | Searched for RT-09 field references in DomainProfile/DomainAuthorityRecord schemas | FAILED TO FALSIFY — zero RT-09 dependencies |
| W2-06 can emit constitutionally valid records | Checked _utils.js validation for array fields; checked RT15-INV-3 ambiguity | FAILED TO FALSIFY — schema-valid; RT15-INV-3 does not require minimum array population |
| RT-15 ordering is achievable | Tested for circular dependency; tested forward reference | FAILED TO FALSIFY — no circular dependency; deterministic forward reference works |
| lib/empire/ is correct wiring site | Searched empire module for DOM-* / constitutional domain entities | SUCCEEDED IN FALSIFYING — wiring site is lib/registry/universe/inject() |

**One assumption was successfully falsified** (wiring site). All constitutional feasibility assumptions held.

### 6.2 Comparison with W2-07 (IDR Issued)

| Dimension | W2-07 EvidenceObject (IDR) | W2-06 DomainProfile (No IDR) |
|-----------|---------------------------|------------------------------|
| Critical unresolvable field | `observation_projection_ref` — no RT-08 pipeline | None |
| Honest field count | 3 / 14 (21%) | DAR: 9/9; DP: 9/9 (100%) |
| Array fields empty | N/A | AIR arrays: empty but honest, schema-valid |
| Forward reference needed | N/A | authority_record_ref — resolved by W2-03 precedent |
| Architectural gap | RT-08 entirely absent | None — all data in domain-entities.js |

---

## 7. RISK ASSESSMENT

| ID | Risk | Severity | Probability | Mitigation |
|----|------|----------|-------------|-----------|
| R-01 | RT15-INV-3 "complete" re-interpreted in Wave 3 as requiring non-empty AIR arrays | LOW | LOW | Documented as L-01; emission is honest; Wave 3 update path established |
| R-02 | forward reference `'dar-' + dom.id` conflicts if Wave 3 changes DomainAuthorityRecord ID format | LOW | LOW | ID format is deterministic constant; changing it requires deliberate Wave 3 migration |
| R-03 | inject() singleton — re-emission on domain config change not wired | LOW | MEDIUM | DomainProfile/DomainAuthorityRecord are root bootstrap objects; constitutional store is no-op in Wave 2; Wave 3 establishes update path |
| R-04 | 24 records emitted at startup (12 DAR + 12 DP) — constitutional store receives 24 write() no-ops | NEGLIGIBLE | CERTAIN | No-op store; zero performance impact |
| R-05 | Import path depth error (lib/registry/universe/ → lib/runtime/) | LOW | LOW | **Mitigated** — path verified via node -e; resolves correctly |

**No MEDIUM or HIGH risks. All risks are LOW or NEGLIGIBLE with documented mitigations.**

---

## 8. LIMITATIONS

| ID | Limitation | Severity | Resolution |
|----|-----------|----------|-----------|
| L-01 | All five AIR authority holder arrays are `[]` — no D6 AIR-1 through AIR-5 holders assigned in Wave 2 | LOW | Wave 3: wire RT-02 authority governance; populate AIR arrays per domain with real authority holder references |
| L-02 | `authority_record_ref` is a forward reference (`'dar-' + dom.id`) — Wave 2 no-op store does not enforce write ordering | LOW | Wave 3: constitutional store enforces actual DomainAuthorityRecord-before-DomainProfile commit ordering |
| L-03 | `knowledge_status: 'NOT_ESTABLISHED'` — no RT-10 DomainUnderstandingModel wired | LOW | Wave 3: connect RT-10 domain knowledge output to RT-15 DomainProfile status updates |
| L-04 | `projection_status: 'NOT_ESTABLISHED'` — no RT-13/RT-14 projection objects wired | LOW | Wave 3: connect RT-13/RT-14 projection output to RT-15 DomainProfile status updates |
| L-05 | `internal_representation` uses `dom.purpose` — no formal RT-15 operational state machine | LOW | Wave 3: establish formal RT-15 state representation; update DomainProfile on state change |
| L-06 | `inject()` is a singleton — DomainAuthorityRecord/DomainProfile emitted once at startup; incremental domain state updates not wired | LOW | Wave 3: implement incremental RT-15 state update emission on domain state change events |
| L-07 | Migration ledger SS-07 file list (`lib/empire/`) requires correction to `lib/registry/universe/index.js` | LOW | Update migration ledger in implementation record |

**All 7 limitations are LOW severity with Wave 3 resolution paths. None block Wave 2 certification.**

---

## 9. IMPLEMENTATION PLAN (AUTHORIZED)

### 9.1 Wiring Location

| Parameter | Value |
|-----------|-------|
| File | `lib/registry/universe/index.js` |
| Function | `inject()` |
| Position | After existing `rels.add()` loop, before function returns |
| Pattern | Fire-and-forget V1.0 (CONSTITUTIONAL WIRING PATTERN V1.0) |
| Import 1 | `const { DomainAuthorityRecord, DomainProfile } = require('../../constitutional-types/domain-profile')` |
| Import 2 | `const constitutionalStore = require('../../runtime/constitutional-store')` |
| Path verified | YES — both paths confirmed via node -e |

### 9.2 Proposed Wiring Block

```javascript
// RT-15 DomainAuthorityRecord + DomainProfile — fire-and-forget (W2-06; CONSTITUTIONAL WIRING PATTERN V1.0)
const { DomainAuthorityRecord, DomainProfile } = require('../../constitutional-types/domain-profile');
const constitutionalStore = require('../../runtime/constitutional-store');
setImmediate(async () => {
    const _ts = new Date().toISOString();
    for (const dom of DOMAINS) {
        try {
            const _darId = 'dar-' + dom.id;
            const dar = DomainAuthorityRecord.create({
                dar_id:                  _darId,
                domain_id:               dom.id,
                air_1_authority_holders: [],
                air_2_authority_holders: [],
                air_3_authority_holders: [],
                air_4_authority_holders: [],
                air_5_authority_holders: [],
                air_compliance_status:   'NOT_ESTABLISHED',
                last_updated_at:         _ts,
            });
            await constitutionalStore.write(dar);
            const dp = DomainProfile.create({
                domain_profile_id:       'dp-' + dom.id,
                domain_id:               dom.id,
                domain_name:             dom.name,
                reality_context:         dom.description,
                internal_representation: dom.purpose,
                authority_record_ref:    _darId,
                knowledge_status:        'NOT_ESTABLISHED',
                projection_status:       'NOT_ESTABLISHED',
                last_updated_at:         _ts,
            });
            await constitutionalStore.write(dp);
        } catch (err) {
            console.error(`[constitutional-record] RT-15 ${dom.id} failed:`, err?.message);
        }
    }
});
```

**Pattern compliance:** imports captured before setImmediate (closure safety); DomainAuthorityRecord emitted before DomainProfile per domain; single try/catch per domain iteration; production path unblocked.

### 9.3 Emission Profile

| Metric | Value |
|--------|-------|
| Records emitted per startup | 24 (12 DomainAuthorityRecords + 12 DomainProfiles) |
| Trigger frequency | Once at startup (singleton inject()) |
| Store impact | 24 no-op write() calls in Wave 2 |
| Production path blocking | NONE — fire-and-forget |

---

## 10. FINAL RECOMMENDATION

**Decision: B — IMPLEMENTABLE WITH LIMITATIONS**

**Authorize W2-06 implementation.** All 18 required fields across both constitutional types (DomainAuthorityRecord 9/9 + DomainProfile 9/9) can be honestly populated from data available in `lib/registry/universe/domain-entities.js`. No fabrication required. No IDR. Seven LOW-severity Wave 3 limitations documented.

**Mandatory wiring site correction:** Implementation must target `lib/registry/universe/index.js:inject()` — not any file in `lib/empire/`. Migration ledger file list to be corrected in implementation record.

---

*W2-06 Phase 0 Baseline: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0.*  
*Type authority: R15-v1.0-canonical.md RS-07 RS-10; A0-v1.1.1 §3.16; RT15-INV-1; RT15-INV-3; D6 AIR-1 through AIR-5.*  
*Verified: inject() production call path (lib/registry/index.js:48); import paths (node -e); module load (PASS).*
