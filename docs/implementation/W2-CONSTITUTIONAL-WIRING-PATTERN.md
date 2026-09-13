# W2 Constitutional Wiring Pattern

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | W2-CONSTITUTIONAL-WIRING-PATTERN |
| Issuing Authority | APEX Constitutional Governance |
| Date | 2026-07-28 |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Constitutional Authority | D8-v1.0; A0-v1.1.1; I2-IMPLEMENTATION-GOVERNANCE-MODEL.md |
| Status | PC-03 RESOLVED — APPROVED |
| Applies To | All Wave 2 constitutional wiring tasks (W2-01 through W2-10) |

---

## 1. PURPOSE

This document defines the mandatory pattern for all Wave 2 constitutional wiring. Every task that adds constitutional record emission to a production subsystem must follow this pattern exactly. Deviation from the pattern is a constitutional governance violation.

**Why this pattern exists:**
- Constitutional record persistence must never block the production execution path
- Store failures must be absorbed silently — no constitutional persistence failure may surface to callers
- Every constitutional record must be correctly typed, carry accurate provenance, and be structurally valid at emit time
- All Wave 2 wiring must be additive — no existing logic may be altered, removed, or reordered

This document is the reference that WAVE-2-CERTIFICATION-GATES.md Gate 2 reviews are conducted against.

---

## 2. AUTHORITY MODEL

### Constitutional Type Authority Hierarchy

```
A0-v1.1.1 (Constitutional Foundation)
    └── RT<n>-v1.0-canonical.md (Runtime Specification)
            └── lib/constitutional-types/<file>.js (Type Implementation)
                    └── <TypeName>.create({...}) (Record Emission)
```

### Which Type to Use

The authoritative mapping of production subsystem → constitutional type is in `WAVE-2-TYPE-ADOPTION-MATRIX.md`. Before wiring any subsystem, consult the matrix to identify:
- The primary type (the type whose emission satisfies the Gate 3 criterion for that subsystem)
- Secondary types (additional types emitted at the same location)
- The file in `lib/constitutional-types/` that exports the type

The Type Adoption Matrix is L2 authority. Do not use type names from any other source.

### Require Paths

All constitutional types are in `lib/constitutional-types/`. The require path from a file in `lib/runtime/` or `lib/memory/` is:

```javascript
const { TypeName } = require('../constitutional-types/<file>');
```

From `server.js` or a file in the project root:

```javascript
const { TypeName } = require('./lib/constitutional-types/<file>');
```

**Never use the index aggregator (`index.js`) in wiring code.** Always require the specific file. The index is for registry-level operations only.

---

## 3. HOW RUNTIME CODE REFERENCES CONSTITUTIONAL TYPES

### Placement Rule

The `require()` call for a constitutional type may be placed in one of two locations:

**Option A — Module-level require (preferred when the wiring file is certain to always execute):**
```javascript
'use strict';

// ... existing requires ...
const { KernelOperationManifest } = require('../constitutional-types/kernel-record');
```

**Option B — Inline require inside the fire-and-forget block (when module-level require is impractical):**
```javascript
setImmediate(async () => {
  try {
    const { KernelOperationManifest } = require('../constitutional-types/kernel-record');
    const record = KernelOperationManifest.create({ ... });
    await constitutionalStore.write(record);
  } catch (err) {
    constitutionalErrorLog.record(err);
  }
});
```

Option B is less efficient (require is cached but the destructure is re-evaluated on every call) but acceptable when Option A would require significant refactoring of an existing require block.

### Verifying the Require Path

Before committing any wiring:

```bash
node -e "const { TypeName } = require('./lib/constitutional-types/<file>'); console.log('loaded:', !!TypeName);"
```

This must print `loaded: true`. If `TypeName` is undefined, the export name is wrong. If the command throws `MODULE_NOT_FOUND`, the file path is wrong.

---

## 4. HOW CONSTITUTIONAL RECORDS ARE CREATED

### The Mandatory Pattern

```javascript
// Constitutional wiring — fire-and-forget (CONSTITUTIONAL WIRING PATTERN v1.0)
setImmediate(async () => {
  try {
    const record = TypeName.create({
      // Required fields per TypeName.SCHEMA
      field_a: sourceValue_a,
      field_b: sourceValue_b,
      // ... all required fields populated from production context
    });
    await constitutionalStore.write(record);
  } catch (err) {
    constitutionalErrorLog.record(err);
  }
});
```

### Rules

1. **`setImmediate` is mandatory.** The fire-and-forget block MUST be wrapped in `setImmediate`. This ensures the production caller completes its current tick before the constitutional emission begins.

2. **`async` inside `setImmediate` is mandatory.** The `await constitutionalStore.write(record)` requires an async context.

3. **No `await` before `setImmediate`.** The production code path must not await the `setImmediate` callback. The callback runs in a future tick.

4. **`TypeName.create()` is the only valid record construction method.** Do not construct the record object manually. `create()` ensures the CONSTITUTIONAL block is populated with the correct baseline, runtime_id, and type string.

5. **Populate all required fields.** Inspect `TypeName.SCHEMA` for fields where `required: true`. Every required field must be populated from the production context available at the wiring point. Do not pass `undefined` for required fields.

6. **Field values must be honest.** Map production values faithfully. Do not fabricate, synthesize, or infer values that are not directly observable at the wiring point. If a required field value is not available at the wiring location, the wiring location is wrong — find the correct location where the value is present.

---

## 5. REQUIRED METADATA FIELDS

Every constitutional record created via `TypeName.create()` receives a CONSTITUTIONAL block automatically. The implementer must NOT manually construct this block. It is injected by `create()`.

The CONSTITUTIONAL block will contain:
```javascript
{
  type:      'TypeName',               // the type's registered name
  runtime_id: 'RT-XX',                // the runtime this type belongs to
  runtime_name: 'Runtime Name',       // human-readable runtime name
  authority:  '...',                  // D/A/R-series authority citations
  baseline:   'APEX-CONSTITUTION-v1.0', // must always be this value
  wave:       'W1-XX',                // wave this type was defined in
  version:    '1.0.0',
  ...
}
```

The implementer is responsible only for the SCHEMA fields — the fields specific to what happened at the wiring point (e.g., `operation_id`, `rejection_reason`, `changed_entity_ref`, etc.).

**Minimum context a wiring site must provide:**
- A unique identifier for the event (operation ID, request ID, entity ID, etc.)
- A timestamp (ISO 8601 — use `new Date().toISOString()`)
- The primary content fields that distinguish one record from another

---

## 6. PROVENANCE REQUIREMENTS

Constitutional provenance means each record can be traced back to the operation that produced it.

### Provenance Chain Rule

Every constitutional record emitted in Wave 2 must carry at minimum:
- A unique identifier for this specific record/event
- A timestamp indicating when the event occurred
- A reference to the originating operation where available (e.g., `operation_id`, `transaction_id`, `request_id`)

### PETL Provenance Anchor

Once W2-02 (PETL) is complete, every request through the system will have a `KernelOperationManifest` record with an `operation_id`. Downstream constitutional records (from W2-01 Memory, W2-03 Reality Fabric, etc.) should include the PETL `operation_id` as a provenance reference field where the type schema supports it.

If the type schema does not have a field for the PETL operation_id, do not add one — do not alter type schemas. Only populate fields that exist in the schema.

### Timestamp Rule

All timestamps must be:
- Generated at the wiring site using `new Date().toISOString()`
- ISO 8601 format (e.g., `"2026-07-28T12:00:00.000Z"`)
- Never backdated or synthesized from cached values

---

## 7. VALIDATION REQUIREMENTS

### Pre-Wiring Offline Validation

Before the wiring site is committed, verify the `create()` call is syntactically correct and produces a valid record:

```javascript
// Run offline (no store needed):
const { TypeName } = require('./lib/constitutional-types/<file>');
const record = TypeName.create({
  // populate with representative test values
  field_a: 'test-id-001',
  field_b: new Date().toISOString(),
  // ... all required fields
});
console.log('create() returned object:', typeof record === 'object');
console.log('CONSTITUTIONAL.type:', record.CONSTITUTIONAL.type);
console.log('CONSTITUTIONAL.baseline:', record.CONSTITUTIONAL.baseline);
console.log('validate():', TypeName.validate(record));
```

All four checks must pass before the wiring is considered correct.

### Post-Wiring Registry Validation

After wiring is committed, run:

```javascript
const idx = require('./lib/constitutional-types/index.js');
const keys = Object.keys(idx).filter(k => idx[k] && idx[k].CONSTITUTIONAL);
console.log('type count:', keys.length); // Must still be 83
console.log('all baselines correct:', keys.every(k => idx[k].CONSTITUTIONAL.baseline === 'APEX-CONSTITUTION-v1.0'));
console.log('all frozen:', keys.every(k => Object.isFrozen(idx[k])));
```

All three must remain true. Any regression in type count, baseline, or freeze status is a CRITICAL failure.

### Syntax Checks

```bash
node --check server.js
node --check <modified-file>
```

Both must pass before INTEGRATED status is claimed.

### Test Suite

```bash
node tests/registry/index.js
```

Must produce: `≥538 passed, 3 failed` (the 3 pre-existing failures are the domain count assertion — they are baseline, not regressions). Zero new failures is the acceptance criterion.

---

## 8. ERROR HANDLING RULES

### The Catch Block

```javascript
} catch (err) {
  constitutionalErrorLog.record(err);
}
```

**MUST:**
- Catch ALL errors thrown inside the `setImmediate` block — including errors from `create()`, errors from `write()`, and any errors from field population
- Log the error via `constitutionalErrorLog.record(err)` or equivalent error logging

**MUST NOT:**
- Re-throw the error
- Call `next(err)` or any error handler that surfaces to the caller
- Modify, alter, or cancel the production code path in response to the error
- Set any flag, shared state, or variable that affects production behavior

### Why These Rules Exist

The fire-and-forget pattern is designed so that constitutional record persistence failures are completely invisible to the production system. If the constitutional store is unavailable, returns an error, or times out, the production operation must complete normally. Constitutional observability is additive — its absence must never degrade system availability.

### Store Unavailability

If `constitutionalStore` is not yet implemented or returns errors:
- The catch block absorbs the error silently
- The wiring is still considered complete (the emission attempt is what matters)
- The Gate 3 criterion for offline environments accepts documented store unavailability

---

## 9. TESTING REQUIREMENTS

### Unit Test Pattern for Wiring

For each wiring point, produce an offline test that confirms:

1. The `create()` call executes without throwing
2. The record has the correct `CONSTITUTIONAL.type`
3. The record has `CONSTITUTIONAL.baseline === 'APEX-CONSTITUTION-v1.0'`
4. The production caller is not blocked (the `setImmediate` callback runs after the caller returns)

```javascript
// Offline wiring test pattern — no live store required
const assert = require('assert');

// Mock store — confirms emission attempt without real persistence
const emittedRecords = [];
const mockStore = {
  write: async (record) => { emittedRecords.push(record); }
};

// Import the wiring under test
// ... trigger the production function that was wired ...

// After one event loop tick (to allow setImmediate to run):
setImmediate(() => {
  assert.strictEqual(emittedRecords.length, 1, 'Expected one record emitted');
  assert.strictEqual(emittedRecords[0].CONSTITUTIONAL.type, 'TypeName');
  assert.strictEqual(emittedRecords[0].CONSTITUTIONAL.baseline, 'APEX-CONSTITUTION-v1.0');
  console.log('PASS: wiring test');
});
```

### Regression Prevention

Before claiming VERIFIED status, confirm that the test suite result is identical to the baseline (`538 pass, 3 fail`). If a new failure appears after wiring, the wiring introduced a regression — find and fix it before advancing.

### Phase 0 Tests

If the wiring touches a write path covered by Phase 0 acceptance tests (`tests/phase0-acceptance.test.js`), those tests require live Supabase credentials. In an offline development environment, document the test as "offline-unverifiable" per WAVE-2-CERTIFICATION-GATES.md Part 5 accommodation, recording that the test was previously verified as passing (9/9) in an authenticated session.

---

## 10. EXAMPLES

### Example A — PETL begin() Wiring (W2-02 reference)

```javascript
// In lib/runtime/execution-transaction.js, inside begin():
// After: this._setState(STATES.PREFLIGHT); — no existing logic changed

const { KernelOperationManifest } = require('../constitutional-types/kernel-record');

// Constitutional wiring — fire-and-forget (CONSTITUTIONAL WIRING PATTERN v1.0)
setImmediate(async () => {
  try {
    const record = KernelOperationManifest.create({
      manifest_id:    this.transactionId + '-manifest',
      operation_id:   this.transactionId,
      runtime_id:     'RT-03',
      operation_type: 'PETL_BEGIN',
      initiated_at:   new Date().toISOString(),
      initiating_actor_ref: this.actorRef || 'unknown',
      gate_sequence_required: true,
    });
    await constitutionalStore.write(record);
  } catch (err) {
    constitutionalErrorLog.record(err);
  }
});

// Production code continues normally — no await, no blocking
return this; // or whatever begin() currently returns
```

### Example B — Memory Gateway Wiring (W2-01 reference)

```javascript
// In lib/memory/gateway.js, inside getHistoricalState():
// After: const result = await this._queryHistoricalState(params);

const { HistoricalStateQueryResult } = require('../constitutional-types/historical-state-record');

// Constitutional wiring — fire-and-forget (CONSTITUTIONAL WIRING PATTERN v1.0)
setImmediate(async () => {
  try {
    const record = HistoricalStateQueryResult.create({
      query_result_id:   generateId('hsqr'),
      query_timestamp:   new Date().toISOString(),
      queried_entity_ref: params.entityRef || params.entity_id,
      result_count:      Array.isArray(result) ? result.length : 1,
      query_successful:  true,
    });
    await constitutionalStore.write(record);
  } catch (err) {
    constitutionalErrorLog.record(err);
  }
});

// Return value unchanged — caller receives result, not record
return result;
```

### Example C — Store Not Yet Implemented (expected behavior)

During Wave 2, `constitutionalStore` may not yet be implemented. The catch block absorbs any `TypeError: constitutionalStore.write is not a function` or similar error. This is expected and acceptable. The wiring is still INTEGRATED; VERIFIED requires evidence of create() execution, not successful store persistence.

---

## ROLLBACK PROCEDURE

Rollback for any wiring task:

1. Remove the `require()` line for the constitutional type (if module-level; skip if inline)
2. Remove the entire `setImmediate(async () => { try { ... } catch (err) { ... } });` block
3. Verify: `node --check server.js` PASS
4. Verify: `node tests/registry/index.js` — 538 pass, 3 fail (identical to baseline)
5. Document rollback in task record

No other changes are needed. The production code path is restored to its exact pre-wiring state. The constitutional types module is not affected by rollback.

---

## TASK RECORD TEMPLATE

Each Wave 2 wiring task must create:

`docs/constitutional-architecture/implementation/W2-<nn>-<SUBSYSTEM>-RECORD.md`

With sections:
1. **Header** — Task ID, subsystem, constitutional runtime, types wired, authorized date
2. **Wiring** — Files modified, wiring locations (file:line), type(s) wired, field mapping used
3. **Test Evidence** — Paste of `node tests/registry/index.js` output showing ≥538 pass / 3 fail
4. **Verification** — Evidence of `create()` executing (log paste, test output, or offline mock trace)
5. **Certification** — (after VERIFIED) Sample record or hash, validation result, certifier name, date

---

*W2 Constitutional Wiring Pattern created: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
*Constitutional authority: D8-v1.0; A0-v1.1.1; I2-IMPLEMENTATION-GOVERNANCE-MODEL.md.*
*Approved as PC-03 resolution by Implementation Owner authorization.*
