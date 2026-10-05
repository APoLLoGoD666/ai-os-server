'use strict';
// tests/d5-uncertainty.test.js
// T3-01 D5 Uncertainty Protocol — constitutional tests.
// Run: node tests/d5-uncertainty.test.js
// No live Supabase required.

const { createUncertaintyDescriptor, validateUncertaintyDescriptor } = require('../lib/reality/d5-uncertainty');

// ── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (e) {
        console.error(`  FAIL  ${name}\n        ${e.message}`);
        failed++;
    }
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertThrows(fn, msgFragment) {
    let threw = false;
    try { fn(); } catch (e) {
        threw = true;
        if (msgFragment && !e.message.includes(msgFragment)) {
            throw new Error(`Expected error containing "${msgFragment}", got: ${e.message}`);
        }
    }
    if (!threw) throw new Error(`Expected function to throw but it did not`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function validInputs() {
    return {
        uncertainty_source:             'APEX internal self-observation via reality fabric',
        uncertainty_confidence:         0.75,
        uncertainty_limitations:        ['no external verification', 'single observation point'],
        uncertainty_observer_capability: {
            observer_id:        'APEX-SYSTEM',
            capability_level:   'OPERATIONAL',
            calibration_status: 'CURRENT',
        },
    };
}

function validDescriptorForValidate() {
    return {
        uncertainty_source:             'APEX internal self-observation via reality fabric',
        uncertainty_confidence:         0.75,
        uncertainty_limitations:        ['no external verification'],
        uncertainty_timestamp:          new Date().toISOString(),
        uncertainty_observer_capability: { observer_id: 'APEX-SYSTEM', capability_level: 'OPERATIONAL' },
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n  T3-01 D5 Uncertainty Protocol Tests\n');

// 1. createUncertaintyDescriptor creates valid descriptor
test('createUncertaintyDescriptor creates valid descriptor', () => {
    const d = createUncertaintyDescriptor(validInputs());
    if (!d) throw new Error('descriptor is falsy');
    if (typeof d.uncertainty_source !== 'string') throw new Error('uncertainty_source not a string');
    if (typeof d.uncertainty_confidence !== 'number') throw new Error('uncertainty_confidence not a number');
    if (!Array.isArray(d.uncertainty_limitations)) throw new Error('uncertainty_limitations not an array');
    if (typeof d.uncertainty_timestamp !== 'string') throw new Error('uncertainty_timestamp not a string');
    if (typeof d.uncertainty_observer_capability !== 'object') throw new Error('uncertainty_observer_capability not an object');
    assertEqual(d.uncertainty_source, 'APEX internal self-observation via reality fabric');
    assertEqual(d.uncertainty_confidence, 0.75);
});

// 2. validateUncertaintyDescriptor accepts valid descriptor
test('validateUncertaintyDescriptor accepts valid descriptor', () => {
    const result = validateUncertaintyDescriptor(validDescriptorForValidate());
    if (!result.valid) throw new Error(`Expected valid=true, errors: ${result.errors.join('; ')}`);
    if (result.errors.length !== 0) throw new Error(`Expected no errors, got: ${result.errors.join('; ')}`);
});

// 3. Missing uncertainty_source rejected
test('Missing uncertainty_source rejected', () => {
    const inputs = validInputs();
    delete inputs.uncertainty_source;
    assertThrows(() => createUncertaintyDescriptor(inputs), 'uncertainty_source');
});

// 4. Confidence below 0 rejected
test('Confidence below 0 rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_confidence: -0.01 }),
        'uncertainty_confidence'
    );
});

// 5. Confidence above 1 rejected
test('Confidence above 1 rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_confidence: 1.01 }),
        'uncertainty_confidence'
    );
});

// 6. Missing limitations rejected
test('Missing limitations rejected', () => {
    const inputs = validInputs();
    delete inputs.uncertainty_limitations;
    assertThrows(() => createUncertaintyDescriptor(inputs), 'uncertainty_limitations');
});

// 7. Missing timestamp rejected by validateUncertaintyDescriptor
test('Missing timestamp rejected by validateUncertaintyDescriptor', () => {
    const descriptor = validDescriptorForValidate();
    delete descriptor.uncertainty_timestamp;
    const result = validateUncertaintyDescriptor(descriptor);
    if (result.valid) throw new Error('Expected valid=false when timestamp missing');
    const mentionsTimestamp = result.errors.some(e => e.includes('uncertainty_timestamp'));
    if (!mentionsTimestamp) throw new Error(`Expected error about uncertainty_timestamp, got: ${result.errors.join('; ')}`);
});

// 8. Missing observer capability rejected
test('Missing observer capability rejected', () => {
    const inputs = validInputs();
    delete inputs.uncertainty_observer_capability;
    assertThrows(() => createUncertaintyDescriptor(inputs), 'uncertainty_observer_capability');
});

// 9. Invalid objects (null, string, number) rejected by validateUncertaintyDescriptor
test('null descriptor rejected by validateUncertaintyDescriptor', () => {
    const result = validateUncertaintyDescriptor(null);
    if (result.valid) throw new Error('Expected valid=false for null');
});

test('string descriptor rejected by validateUncertaintyDescriptor', () => {
    const result = validateUncertaintyDescriptor('invalid');
    if (result.valid) throw new Error('Expected valid=false for string');
});

test('number descriptor rejected by validateUncertaintyDescriptor', () => {
    const result = validateUncertaintyDescriptor(42);
    if (result.valid) throw new Error('Expected valid=false for number');
});

// 10. Timestamp generated only at creation time (not caller-supplied)
test('Timestamp generated only at creation time', () => {
    const before = Date.now();
    const d = createUncertaintyDescriptor(validInputs());
    const after = Date.now();
    const ts = Date.parse(d.uncertainty_timestamp);
    if (Number.isNaN(ts)) throw new Error('uncertainty_timestamp is not a valid ISO timestamp');
    if (ts < before || ts > after) throw new Error('uncertainty_timestamp was not generated at creation time');
});

test('Caller-supplied timestamp is ignored (timestamp always generated internally)', () => {
    // The create function does not accept uncertainty_timestamp in its input —
    // even if a caller passes it as part of a spread, it is overwritten internally.
    const inputs = { ...validInputs(), uncertainty_timestamp: '1970-01-01T00:00:00.000Z' };
    const d = createUncertaintyDescriptor(inputs);
    // The returned descriptor must NOT have the caller-supplied epoch timestamp
    if (d.uncertainty_timestamp === '1970-01-01T00:00:00.000Z') {
        throw new Error('Descriptor used caller-supplied timestamp — D5 §3.2 violation');
    }
    // Must be a recent timestamp
    const ts = Date.parse(d.uncertainty_timestamp);
    if (Number.isNaN(ts)) throw new Error('uncertainty_timestamp is not a valid ISO timestamp');
    if (ts < Date.now() - 5000) throw new Error('uncertainty_timestamp is unreasonably old');
});

// 11. Descriptor cannot be silently modified after validation (frozen)
test('Descriptor is frozen — cannot be silently modified after creation', () => {
    const d = createUncertaintyDescriptor(validInputs());
    if (!Object.isFrozen(d)) throw new Error('Descriptor is not frozen');
    // In strict mode, mutation attempt throws TypeError
    let mutationThrew = false;
    try {
        d.uncertainty_source = 'hacked';
    } catch (e) {
        mutationThrew = true;
    }
    // Either threw (strict mode) or silently ignored (non-strict) — either way field is unchanged
    if (d.uncertainty_source !== 'APEX internal self-observation via reality fabric') {
        throw new Error('Frozen descriptor was mutated');
    }
});

// ── Module export contract ────────────────────────────────────────────────────

test('module exports are frozen', () => {
    const d5 = require('../lib/reality/d5-uncertainty');
    if (!Object.isFrozen(d5)) throw new Error('module.exports is not frozen');
});

test('module exports createUncertaintyDescriptor and validateUncertaintyDescriptor', () => {
    const d5 = require('../lib/reality/d5-uncertainty');
    if (typeof d5.createUncertaintyDescriptor !== 'function') throw new Error('createUncertaintyDescriptor not exported');
    if (typeof d5.validateUncertaintyDescriptor !== 'function') throw new Error('validateUncertaintyDescriptor not exported');
});

// ── Boundary values ───────────────────────────────────────────────────────────

test('Confidence 0 accepted (lower bound)', () => {
    const d = createUncertaintyDescriptor({ ...validInputs(), uncertainty_confidence: 0 });
    assertEqual(d.uncertainty_confidence, 0);
});

test('Confidence 1 accepted (upper bound)', () => {
    const d = createUncertaintyDescriptor({ ...validInputs(), uncertainty_confidence: 1 });
    assertEqual(d.uncertainty_confidence, 1);
});

test('Empty limitations array accepted', () => {
    const d = createUncertaintyDescriptor({ ...validInputs(), uncertainty_limitations: [] });
    if (!Array.isArray(d.uncertainty_limitations)) throw new Error('Expected array');
    if (d.uncertainty_limitations.length !== 0) throw new Error('Expected empty array');
});

test('Empty string uncertainty_source rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_source: '' }),
        'uncertainty_source'
    );
});

test('Whitespace-only uncertainty_source rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_source: '   ' }),
        'uncertainty_source'
    );
});

test('Array passed as uncertainty_observer_capability rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_observer_capability: [] }),
        'uncertainty_observer_capability'
    );
});

test('null passed as uncertainty_observer_capability rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_observer_capability: null }),
        'uncertainty_observer_capability'
    );
});

test('NaN passed as uncertainty_confidence rejected', () => {
    assertThrows(
        () => createUncertaintyDescriptor({ ...validInputs(), uncertainty_confidence: NaN }),
        'uncertainty_confidence'
    );
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
