# W1-02A — Canonical Pattern Remediation

**Document ID:** W1-02A-CANONICAL-PATTERN-REMEDIATION  
**Task:** W1-02A  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Date:** 2026-07-25  
**Authority:** W1-GATE-A (VERDICT B); W1-02-CONSTITUTIONAL-TYPE-REFERENCE-IMPLEMENTATION-RECORD.md  
**Scope:** DEF-001 and DEF-002 only. No other Wave 1 work.

---

## 1. Mandate

W1-GATE-A issued VERDICT B (CERTIFIED WITH REQUIRED CHANGES) identifying two Class II deficiencies that must be resolved before W1-03 may begin:

| ID | Class | Description |
|----|-------|-------------|
| DEF-001 | II | Private utility duplication: `_validate` and `_create` would be duplicated in all 14 type files |
| DEF-002 | II | No collision detection in `index.js`: `Object.assign` silently overwrites on name collision |

This record documents the resolution of both deficiencies.

---

## 2. DEF-001 Resolution — Shared Private Utilities

### Decision: Option A — Extract to `_utils.js`

Both options were evaluated against the stated criteria: constitutional isolation, ownership, traceability, dependency minimization, amendment safety, runtime independence, and certification simplicity.

**The decisive analysis:**

`_validate` and `_create` implement D2 URO-A1 (Constitutional Completeness) and D2 URO-A2 (Constitutional Legibility) — constitutional obligations that apply uniformly to all 83 types across all 16 runtimes. They are not constitutional objects and carry no runtime ownership. A shared engineering infrastructure file correctly models this: the obligation is cross-cutting, and the implementation of a cross-cutting obligation should have one authoritative source.

| Criterion | Option A | Option B | Winner |
|-----------|----------|----------|--------|
| Constitutional isolation | Types remain isolated; utilities are infrastructure | Same | Tie |
| Ownership | Utilities have no runtime owner — shared module is correct | 14 file-local copies misrepresent utility as runtime-owned | A |
| Traceability | D2 URO cited once, authoritatively | D2 URO cited 14 times in 14 copies — equivalent but redundant | A |
| Dependency minimization | Adds one `require` per type file | No external dependency, but 14 copies are a hidden coupling | A |
| Amendment safety | One-file update is atomic — no partial state possible | 14-file update window creates partial inconsistency risk | **A** |
| Runtime independence | Utilities carry no runtime-specific state; sharing doesn't cross RT authority boundaries | Correct but unnecessary | Tie |
| Certification simplicity | Certify one file | Verify 14 copies are identical (fragile without tooling) | A |

**Amendment safety is the decisive factor.** If stamp requirements change (a constitutional event), Option A ensures all 83 types see the new behavior simultaneously after one file update. Option B requires 14 independent updates, creating a window where some types emit old stamps and some emit new — a constitutional inconsistency.

**Option B counter-argument addressed:** The assertion that runtime files must be completely self-contained because they are certified by R-series canonical documents is correct for *constitutional type definitions* (CONSTITUTIONAL/SCHEMA blocks, validate(), create() methods). It does not apply to engineering infrastructure. The R-series documents define ownership, schema, and lifecycle — they do not specify implementation details of the validation enforcement mechanism. `_utils.js` implements the enforcement pattern; the enforcement obligation is constitutional. The distinction is preserved.

### Implementation

New file: `lib/constitutional-types/_utils.js`

- Contains `_validate(typeName, schema, data)` — exact function from W1-02 reference implementation
- Contains `_create(typeName, schema, constitutional, data)` — exact function from W1-02 reference implementation
- Exports: `module.exports = Object.freeze({ _validate, _create })`
- Mandate comment: any change to this file is a constitutional amendment affecting all types; requires W1-GATE level review

Modified: `lib/constitutional-types/identity-record.js`

```javascript
// ─── W1-02A · Shared Private Utilities (DEF-001) ─────────────────────────────
// Moved to _utils.js by W1-02A remediation. Implementation unchanged.
const { _validate, _create } = require('./_utils');
```

The 51-line local utility block (lines 44–94 of the W1-02 original) was replaced with this single require. All type definitions (`ActorProfile` through `IdentityEndRecord`) are structurally unchanged — they continue to call `_validate(...)` and `_create(...)` by the same names with the same signatures.

### Replication Mandate for W1-03 through W1-15

Every Wave 1 type file MUST:

1. Add `const { _validate, _create } = require('./_utils');` immediately after the file header block (before the first type definition).
2. MUST NOT re-implement `_validate` or `_create` locally.
3. MUST NOT modify `_utils.js` without W1-GATE level review.

The canonical pattern at the top of each type file is now:

```javascript
'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/<filename>.js
// Task: W1-XX — <Runtime Name> Type Definitions
// Runtime: RT-XX — <Runtime Full Name>
// Baseline: APEX-CONSTITUTION-v1.0
// Date: <date>
// Authority: <R-series>; I1-IMPLEMENTATION-SEQUENCING.md §W1-XX
// [... additional authority lines ...]
// ─────────────────────────────────────────────────────────────────────────────

// ─── W1-02A · Shared Private Utilities (DEF-001) ─────────────────────────────
const { _validate, _create } = require('./_utils');

// [type definitions follow]
```

---

## 3. DEF-002 Resolution — Collision-Detecting Registry

### Problem

The original `index.js` used `Object.assign({}, identity.TYPES)` to build exports. As W1-03 through W1-15 are registered, a type name collision (e.g., two files both exporting a type named `X`) would silently overwrite the first registration with the second. D8 §4.1 assigns canonical type numbers precisely to enforce uniqueness; the registry must enforce this at load time.

### Implementation

`index.js` now implements `_register(sourceFile, runtimeId, typesMap)` with four collision checks before any type is added to `_registered`:

```javascript
function _register(sourceFile, runtimeId, typesMap) {
  // (1) Runtime ownership: same RUNTIME_ID in two source files
  if (_seenRuntimes.has(runtimeId)) { throw ... }
  _seenRuntimes.set(runtimeId, sourceFile);

  for (const [exportName, typeObj] of Object.entries(typesMap)) {
    // (2) CONSTITUTIONAL block present
    if (!typeObj || typeof typeObj !== 'object' || !typeObj.CONSTITUTIONAL) { throw ... }
    const c = typeObj.CONSTITUTIONAL;

    // (3) Export name collision
    if (_seenNames.has(exportName)) { throw ... }

    // (4) CONSTITUTIONAL.type collision (canonical type name uniqueness)
    if (_seenTypeIds.has(c.type)) { throw ... }

    // (5) D8 canonical type number collision (D8 §4.1 uniqueness)
    if (c.d8_canonical_type !== null && c.d8_canonical_type !== undefined) {
      if (_seenD8Types.has(c.d8_canonical_type)) { throw ... }
      _seenD8Types.set(c.d8_canonical_type, c.type);
    }

    _seenNames.set(exportName, sourceFile);
    _seenTypeIds.set(c.type, sourceFile);
    _registered[exportName] = typeObj;
  }
}
```

Error messages are deterministic and identify: the collision type, the colliding name, the source file, and the file that already owns the registration.

### Registration Pattern for W1-03 through W1-15

Every new type file added to `index.js` MUST use:

```javascript
// ─── W1-XX · RT-XX <Runtime Name> (COMPLETE) ─────────────────────────────────
const <moduleVar> = require('./<filename>');
_register('<filename>.js', <moduleVar>.RUNTIME_ID, <moduleVar>.TYPES);
```

Never use `Object.assign` or any flat-merge to add new types to the registry.

### Before/After Comparison

**Before (W1-02):**
```javascript
const identity = require('./identity-record');
module.exports = Object.assign({}, identity.TYPES);
```
Behavior on collision: silently overwrites. The second registration's type replaces the first with no error, no warning, no indication of the collision.

**After (W1-02A):**
```javascript
const identity = require('./identity-record');
_register('identity-record.js', identity.RUNTIME_ID, identity.TYPES);
module.exports = Object.assign({}, _registered);
```
Behavior on collision: throws `Error` at module load time with a deterministic message identifying the collision type, the colliding name, the source file, and the prior owner. The error propagates to the requiring module and prevents the process from continuing with an inconsistent registry.

---

## 4. Validation Evidence

| Check | Result |
|-------|--------|
| `node --check lib/constitutional-types/_utils.js` | PASS |
| `node --check lib/constitutional-types/identity-record.js` | PASS |
| `node --check lib/constitutional-types/index.js` | PASS |
| `node -e "require('./lib/constitutional-types/_utils')"` | PASS (loads, frozen exports) |
| `node -e "require('./lib/constitutional-types')"` (7 types exported) | PASS |
| All 7 RT-01 types accessible with CONSTITUTIONAL.type correct | PASS |
| All 7 RT-01 types accessible with CONSTITUTIONAL.runtime_id === 'RT-01' | PASS |
| `ActorProfile.validate()` valid case | PASS |
| `ActorProfile.validate()` invalid enum | PASS (error message correct) |
| `ActorProfile.create()` produces correct stamps | PASS |
| Runtime ownership collision throws | PASS |
| Export name collision throws | PASS |
| D8 canonical type fields: ActorProfile=1, ExternalReference=2, others=null | CONFIRMED |
| Behavioral regression vs W1-02: none | CONFIRMED |

---

## 5. Remaining Deficiencies

The following deficiencies identified by W1-GATE-A are NOT resolved by W1-02A and are documented here for completeness:

| ID | Class | Description | Resolution Path |
|----|-------|-------------|-----------------|
| DEF-003 | III | No version migration path for `APEX-CONSTITUTION-v1.0` → future baselines | Defer to Wave 2 or dedicated versioning task |
| DEF-004 | III | `validate()` does not recurse into nested object fields | Wave 2 enhancement; Wave 1 types have only scalar/array fields |
| DEF-005 | IV | No runtime-to-file mapping table for navigability | Documentation enhancement; does not affect correctness |
| DEF-006 | IV | Type file load order is implicit | Enforce via W1-16 integration validation; explicit order not currently required |
| DEF-007 | Planning | `ConsequenceObservationRecord` ownership conflict: I1-ARCHITECTURE assigns to RT-14; I1-SEQUENCING W1-06 places under RT-08 | Must be resolved via IDR before W1-06 begins |

DEF-007 is the only pre-blocker for a specific Wave 1 task. W1-03 through W1-05 may proceed without resolving DEF-007.

---

## 6. Final Verdict

**Q1: Is the canonical constitutional type implementation pattern now suitable for all remaining constitutional types?**

Yes. The two Class II deficiencies are resolved. DEF-001 establishes a single authoritative source for shared validation infrastructure. DEF-002 ensures the registry enforces constitutional type uniqueness at load time rather than silently masking collisions. The pattern is sound for W1-03 through W1-15.

**Q2: Can W1-03 through W1-15 proceed without further pattern changes?**

Yes, with one conditional exception: W1-06 must not begin until DEF-007 (ConsequenceObservationRecord ownership conflict) is resolved via an IDR. W1-03, W1-04, W1-05, and W1-07 through W1-15 may proceed without awaiting that resolution.

**Q3: Are any remaining deficiencies implementation blockers?**

No remaining deficiency is a general implementation blocker. DEF-007 is a pre-blocker specifically for W1-06. DEF-003 and DEF-004 are Wave 2 enhancements. DEF-005 and DEF-006 are documentation/tooling improvements with no correctness impact.

---

*W1-02A COMPLETE. W1-03 authorized.*
