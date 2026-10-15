# W2-12 ActorProfile Implementation Record

---

## 1. OBJECTIVE

Wire `lib/founder/profile.js` to emit `ActorProfile` (RT-01) when the founder profile
is loaded from the authoritative database source. This constitutionalises the founder's
identity within the APEX constitutional type system.

**W2-12 constitutional type after this task:**

| Type | Runtime | Wiring site |
|------|---------|------------|
| `ActorProfile` | RT-01 | `founder/profile.js:load()` — after DB-loaded profile is assembled and cached |

---

## 2. DISCOVERY FINDINGS

### 2.1 Target File

`lib/founder/profile.js` (99 lines before W2-12, 119 after):
- Exports: `{ load, invalidate, getSection, getCoreValueKeywords, getAntiGoals, getProtectedPeople }`
- `load()` is async: reads `founder_memory` table, assembles profile, caches 24h
- Three execution paths: (1) cache hit, (2) DB error → fallback, (3) DB success → assembled profile

### 2.2 Identity Data Available

The DB-loaded profile has `profile.identity` = the entire `identity` section from `founder_memory`.
The key `identity.name` holds the founder's display name (section='identity', key='name').

The fallback context (`FALLBACK_CONTEXT` from `lib/memory/founder-memory.js`) has a flat structure
(`identity_summary`, `communication_style`, etc.) without an `identity.name` path — confirming
that emission should target the DB-loaded path only.

### 2.3 actor_type Correction

The recomputed roadmap (§2.3) listed `actor_type: 'FOUNDER'`. This value is NOT in the
ActorProfile schema enum (`['HUMAN', 'AGENT']`) and would cause `create()` to throw.
**Corrected to `'HUMAN'`** — the founder is a human actor per D0 §Domain II.

---

## 3. CONSTITUTIONAL WIRING

### 3.1 Wiring Location

**File:** `lib/founder/profile.js`  
**Function:** `load()`  
**Location:** After `cache.set(CACHE_KEY, profile, CACHE_TTL)`, before `return profile`  
**Pattern:** Fire-and-forget V1.0 (CONSTITUTIONAL WIRING PATTERN V1.0)

### 3.2 Emission Scope

| Path | Emits ActorProfile? | Rationale |
|------|---------------------|-----------|
| Cache hit | NO | Profile already recorded; avoids repeated emission |
| Fallback path | NO (L-01) | Non-authoritative data; no `identity.name` in flat fallback structure |
| DB-loaded path | YES | Authoritative; `profile.identity?.name` available |

---

## 4. FIELD MAPPING

| Field | Source | Value | Honesty |
|-------|--------|-------|---------|
| `actor_id` | Synthetic | `'FOUNDER-APEX'` | Constitutional system identifier (L-02): no persistent actor_id in founder_memory |
| `actor_type` | Constant | `'HUMAN'` | Founder is a human actor per D0 §Domain II Actor category |
| `display_name` | `profile.identity?.name \|\| profile.identity?.display_name \|\| 'APEX Founder'` | Founder's name from DB | Direct from authoritative DB-loaded profile; defensively falls back to constitutional designation |
| `registered_at` | `new Date().toISOString()` | ISO 8601 at setImmediate execution | Wave 2 L-03: no persistent registration timestamp |
| `status` | Constant | `'ACTIVE'` | Founder is constitutionally active — directly observable from system operation |

**Honest field satisfaction: 5/5 required fields (100%)**

Optional fields omitted: `structural_identity_ref` (L-04), `provenance_chain_ref` (L-05), `constitutional_era` (L-06).

---

## 5. PROVENANCE

**PETL linkage:** `load()` runs outside any PETL transaction context. No operation_id is available.
The implementation does NOT fabricate a PETL linkage.

**Emission chain:** DB read → `_assemble()` → `cache.set()` → `setImmediate` schedules ActorProfile
creation → `return profile` → caller receives result → setImmediate fires. The constitutional
record is fully decoupled from the return path.

**No PETL provenance for ActorProfile records** — documented as L-05. Wave 3 resolution path:
PETL-aware invocation path if profile loading is brought under PETL governance.

---

## 6. FILES MODIFIED

| File | Change |
|------|--------|
| `lib/founder/profile.js` | Added 2 constitutional imports + fire-and-forget emission block in `load()` (DB-loaded path only) |

**Files created:**

| File | Purpose |
|------|---------|
| `tests/actor-profile-constitutional.test.js` | 28 W2-12 tests |
| `docs/implementation/W2-12-ACTORPROFILE-BASELINE.md` | Phase 0 baseline |
| `docs/constitutional-architecture/implementation/W2-12-ACTORPROFILE-IMPLEMENTATION-RECORD.md` | This document |

---

## 7. TESTS ADDED

**File:** `tests/actor-profile-constitutional.test.js` (28 tests, all passing)

| Category | Tests |
|----------|-------|
| `ActorProfile.create()` with W2-12 field values | 10 |
| ActorProfile field validation | 5 |
| `ActorProfile.validate()` | 3 |
| Module integrity | 6 |
| Optional fields (Wave 2 deferred) | 3 |
| Fire-and-forget emission infrastructure | 1 |
| **Total** | **28** |

---

## 8. LIMITATIONS

| ID | Limitation | Severity | Resolution |
|----|-----------|----------|-----------|
| L-01 | ActorProfile emitted only from DB-loaded path. Fallback context has flat structure (`identity_summary` not `identity.name`); no emission on fallback | LOW | Acceptable for Wave 2; fallback is non-authoritative |
| L-02 | No persistent `actor_id` in founder_memory. Constitutional identifier `'FOUNDER-APEX'` is synthetic | LOW | Wave 3: establish permanent actor_id in founder_memory schema; set once |
| L-03 | `registered_at` is emission timestamp, not actual constitutional registration date | LOW | Wave 3: establish permanent `registered_at` in founder_memory; use stored value |
| L-04 | `structural_identity_ref` omitted — no StructuralIdentityRecord wired in Wave 2 | LOW | Wave 3: wire StructuralIdentityRecord; populate forward reference here |
| L-05 | No PETL provenance (`provenance_chain_ref` omitted) — `load()` runs outside PETL context | LOW | Wave 3: PETL-aware invocation path if needed |
| L-06 | `constitutional_era` omitted — civilizational era system not implemented | LOW | Wave 3: implement era designation; wire here once established |

---

## 9. VALIDATION EVIDENCE

### W2-12 Tests
```
Results: 28 passed, 0 failed
```

### W2-08 Regression (Governance Attestation)
```
Results: 28 passed, 0 failed
```

### W2-10 Regression (Coherence Violation)
```
Results: 33 passed, 0 failed
```

### W2-04 Regression (Gate 6)
```
Results: 26 passed, 0 failed
```

### W2-03 Regression (Reality Fabric)
```
Results: 34 passed, 0 failed
```

### W2-02 Regression (PETL)
```
Results: 18 passed, 0 failed
```

### W2-01 Regression (Memory Gateway)
```
Results: 29 passed, 0 failed
```

### Registry Regression
```
Results: 538 passed, 3 failed, 0 skipped
```
Pre-existing 3 failures unchanged. Zero new failures.

### Syntax and Module Checks
```
node --check lib/founder/profile.js  → PASS
node -e "require('./lib/founder/profile')"  → PASS (loads cleanly)
profile.js exports: load, invalidate, getSection, getCoreValueKeywords, getAntiGoals, getProtectedPeople
```

---

## 10. RECOMMENDATION

**W2-12 READY FOR CERTIFICATION**

All constitutional requirements for Wave 2 integration are satisfied:

1. Canonical RT-01 type (`ActorProfile`) wired at `lib/founder/profile.js:load()` (DB-loaded path)
2. Fire-and-forget V1.0 pattern correctly applied — production path unblocked
3. All 5 required fields populated honestly — no fabrication
4. `actor_type: 'HUMAN'` — correct constitutional category (not 'FOUNDER' which is invalid)
5. `status: 'ACTIVE'` — directly observable constitutional state
6. `display_name` from `profile.identity?.name` — authoritative DB source
7. `deletion_policy: 'PROHIBITED'` — D8 PROH-4 compliant
8. `d8_canonical_type: 1` — first canonical object type in constitutional system
9. Registry integrity maintained: 83 types, all baselines correct, all frozen
10. 28/28 W2-12 tests pass; zero new regression failures across all suites
11. Six limitations documented with Wave 3 resolution paths — no limitation blocks certification

---

*W2-12 Implementation Record created: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*  
*Constitutional authority: R1-v1.1 RS-07 RT01-OWN-01; D8 §4.1 Canonical Object Type 1; D0 §Domain II; A0-v1.1.1 §3.1; WAVE-2-MASTERPLAN.md.*
