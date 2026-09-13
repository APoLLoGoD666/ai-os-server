'use strict';
// tests/observer-registry.test.js
// T3-06 Observer Bootstrap Infrastructure — constitutional tests.
// Run: node tests/observer-registry.test.js
// No live Supabase required.

const registry = require('../lib/reality/observer-registry');

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

function assertThrows(fn, msgFragment) {
    let threw = false;
    try { fn(); } catch (e) {
        threw = true;
        if (msgFragment && !e.message.toLowerCase().includes(msgFragment.toLowerCase())) {
            throw new Error(`Expected error containing "${msgFragment}", got: ${e.message}`);
        }
    }
    if (!threw) throw new Error('Expected function to throw but it did not');
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Test observers (unique IDs to avoid cross-test state conflicts) ────────────

let _seq = 0;
function uid() { return `TEST-OBS-${++_seq}-${Date.now()}`; }

function validParams(overrides = {}) {
    return Object.assign({
        observer_id:        uid(),
        observer_type:      'SYSTEM',
        observer_name:      'APEX Test Observer',
        capability_profile: {
            domain_scope:       ['REALITY', 'FABRIC'],
            observation_types:  ['CLAIM', 'STATE'],
            calibration_basis:  'APEX-CONSTITUTION-v1.0',
        },
        limitation_ref: null,
    }, overrides);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n  T3-06 Observer Bootstrap Infrastructure Tests\n');

// 1. Register valid observer
test('Register valid observer', () => {
    const params = validParams();
    const obs = registry.registerObserver(params);
    if (!obs) throw new Error('registerObserver returned falsy');
    assertEqual(obs.observer_id, params.observer_id);
    assertEqual(obs.observer_type, 'SYSTEM');
    assertEqual(obs.observer_name, 'APEX Test Observer');
    if (typeof obs.capability_profile !== 'object') throw new Error('capability_profile not an object');
    assertEqual(obs.status, 'ACTIVE');
});

// 2. Retrieve registered observer
test('Retrieve registered observer', () => {
    const params = validParams();
    registry.registerObserver(params);
    const retrieved = registry.getObserver(params.observer_id);
    if (!retrieved) throw new Error('getObserver returned null for registered observer');
    assertEqual(retrieved.observer_id, params.observer_id);
});

// 3. Reject duplicate observer ID
test('Reject duplicate observer ID', () => {
    const params = validParams();
    const id = params.observer_id;
    registry.registerObserver(params);
    assertThrows(
        () => registry.registerObserver({ ...validParams(), observer_id: id }),
        'already registered'
    );
});

// 4. Reject empty observer identity
test('Reject empty observer_id', () => {
    assertThrows(
        () => registry.registerObserver({ ...validParams(), observer_id: '' }),
        'observer_id'
    );
});

test('Reject whitespace-only observer_id', () => {
    assertThrows(
        () => registry.registerObserver({ ...validParams(), observer_id: '   ' }),
        'observer_id'
    );
});

// 5. Reject missing observer type
test('Reject missing observer_type', () => {
    const params = validParams();
    delete params.observer_type;
    assertThrows(() => registry.registerObserver(params), 'observer_type');
});

test('Reject invalid observer_type', () => {
    assertThrows(
        () => registry.registerObserver({ ...validParams(), observer_type: 'ROBOT' }),
        'observer_type'
    );
});

// 6. Reject missing capability profile
test('Reject missing capability_profile', () => {
    const params = validParams();
    delete params.capability_profile;
    assertThrows(() => registry.registerObserver(params), 'capability_profile');
});

test('Reject null capability_profile', () => {
    assertThrows(
        () => registry.registerObserver({ ...validParams(), capability_profile: null }),
        'capability_profile'
    );
});

test('Reject array as capability_profile', () => {
    assertThrows(
        () => registry.registerObserver({ ...validParams(), capability_profile: [] }),
        'capability_profile'
    );
});

// 7. Registration timestamp generated automatically
test('Registration timestamp generated automatically', () => {
    const before = Date.now();
    const obs = registry.registerObserver(validParams());
    const after = Date.now();
    if (typeof obs.registration_timestamp !== 'string') throw new Error('registration_timestamp not a string');
    const ts = Date.parse(obs.registration_timestamp);
    if (Number.isNaN(ts)) throw new Error('registration_timestamp not a valid ISO timestamp');
    if (ts < before || ts > after) throw new Error('registration_timestamp was not generated at registration time');
});

// 8. Validate valid observer passes
test('validateObserver: valid observer passes', () => {
    const obs = registry.registerObserver(validParams());
    const result = registry.validateObserver(obs);
    if (!result.valid) throw new Error(`Expected valid=true, errors: ${result.errors.join('; ')}`);
    if (result.errors.length !== 0) throw new Error(`Expected no errors, got: ${result.errors.join('; ')}`);
});

// 9. Validate malformed observer fails
test('validateObserver: null fails', () => {
    const result = registry.validateObserver(null);
    if (result.valid) throw new Error('Expected valid=false for null');
});

test('validateObserver: missing observer_id fails', () => {
    const obs = { ...registry.registerObserver(validParams()) };
    delete obs.observer_id;
    const result = registry.validateObserver(obs);
    if (result.valid) throw new Error('Expected valid=false for missing observer_id');
    if (!result.errors.some(e => e.includes('observer_id'))) {
        throw new Error(`Expected error about observer_id, got: ${result.errors.join('; ')}`);
    }
});

test('validateObserver: invalid status fails', () => {
    const result = registry.validateObserver({
        observer_id:   'X',
        observer_type: 'SYSTEM',
        observer_name: 'X',
        capability_profile:   { x: 1 },
        limitation_ref:       null,
        registration_timestamp: new Date().toISOString(),
        status:        'UNKNOWN_STATUS',
    });
    if (result.valid) throw new Error('Expected valid=false for invalid status');
    if (!result.errors.some(e => e.includes('status'))) {
        throw new Error(`Expected error about status, got: ${result.errors.join('; ')}`);
    }
});

// 10. listObservers returns registered observers
test('listObservers returns registered observers', () => {
    const params = validParams();
    registry.registerObserver(params);
    const list = registry.listObservers();
    if (!Array.isArray(list)) throw new Error('listObservers did not return an array');
    if (list.length === 0) throw new Error('listObservers returned empty array — newly registered observer missing');
    const found = list.find(o => o.observer_id === params.observer_id);
    if (!found) throw new Error(`Registered observer ${params.observer_id} not found in listObservers output`);
});

test('listObservers returns array (not the registry Map)', () => {
    const list = registry.listObservers();
    if (!Array.isArray(list)) throw new Error('Expected array');
    // Mutating the returned list must not affect the registry
    const countBefore = list.length;
    list.push({ observer_id: 'INJECTED' });
    const countAfter = registry.listObservers().length;
    if (countAfter !== countBefore) throw new Error('Mutating returned list affected registry state');
});

// 11. Module exports are frozen
test('Module exports are frozen', () => {
    if (!Object.isFrozen(registry)) throw new Error('module.exports is not frozen');
    if (typeof registry.registerObserver !== 'function') throw new Error('registerObserver not exported');
    if (typeof registry.getObserver !== 'function') throw new Error('getObserver not exported');
    if (typeof registry.validateObserver !== 'function') throw new Error('validateObserver not exported');
    if (typeof registry.listObservers !== 'function') throw new Error('listObservers not exported');
});

// 12. Registry does not create authority grants
test('Registry does not create authority grants', () => {
    const obs = registry.registerObserver(validParams());
    // No authority-related fields in observer records
    if ('authority_chain_ref' in obs) throw new Error('authority_chain_ref present — authority fabrication prohibited');
    if ('authority_ref' in obs) throw new Error('authority_ref present — authority fabrication prohibited');
    if ('authority_grants' in obs) throw new Error('authority_grants present — authority fabrication prohibited');
    if ('da_1' in obs || 'da_2' in obs) throw new Error('Decision Authority booleans present — RT-02 scope');
    // Observer type does not escalate to authority claim
    assertEqual(obs.status, 'ACTIVE');
    // No function on the exported API to grant authority
    if ('grantAuthority' in registry) throw new Error('grantAuthority function exists — authority must remain RT-02 scope');
    if ('setAuthority' in registry) throw new Error('setAuthority function exists — authority must remain RT-02 scope');
});

// ── Additional boundary and edge case tests ───────────────────────────────────

test('getObserver returns null for unknown observer_id', () => {
    const result = registry.getObserver('OBSERVER-THAT-DOES-NOT-EXIST-XYZ');
    if (result !== null) throw new Error(`Expected null, got ${JSON.stringify(result)}`);
});

test('HUMAN observer_type accepted', () => {
    const obs = registry.registerObserver({ ...validParams(), observer_type: 'HUMAN' });
    assertEqual(obs.observer_type, 'HUMAN');
});

test('AGENT observer_type accepted', () => {
    const obs = registry.registerObserver({ ...validParams(), observer_type: 'AGENT' });
    assertEqual(obs.observer_type, 'AGENT');
});

test('limitation_ref string accepted', () => {
    const obs = registry.registerObserver({ ...validParams(), limitation_ref: 'OLR-APEX-001' });
    assertEqual(obs.limitation_ref, 'OLR-APEX-001');
});

test('limitation_ref null accepted', () => {
    const obs = registry.registerObserver({ ...validParams(), limitation_ref: null });
    assertEqual(obs.limitation_ref, null);
});

test('limitation_ref defaults to null when omitted', () => {
    const params = validParams();
    delete params.limitation_ref;
    const obs = registry.registerObserver(params);
    assertEqual(obs.limitation_ref, null);
});

test('Registered observer record is frozen', () => {
    const obs = registry.registerObserver(validParams());
    if (!Object.isFrozen(obs)) throw new Error('Registered observer record is not frozen');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
