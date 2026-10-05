'use strict';
// tests/actor-profile-constitutional.test.js — W2-12 ActorProfile wiring tests

const { ActorProfile } = require('../lib/constitutional-types/identity-record');

// ── Minimal test harness ────────────────────────────────────────────────────
let passed = 0; let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
async function testAsync(name, fn) {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

function drain() {
    return new Promise(resolve => setImmediate(resolve));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeValidActorProfile(overrides = {}) {
    return {
        actor_id:      'FOUNDER-APEX',
        actor_type:    'HUMAN',
        display_name:  'APEX Founder',
        registered_at: new Date().toISOString(),
        status:        'ACTIVE',
        ...overrides,
    };
}

// ── ActorProfile.create() — W2-12 field values ──────────────────────────────
console.log('\nActorProfile.create() — W2-12 field values');

test('create() succeeds with W2-12 FOUNDER-APEX field values', () => {
    const record = ActorProfile.create(makeValidActorProfile());
    assertEqual(record.__type, 'ActorProfile');
    assertEqual(record.actor_id, 'FOUNDER-APEX');
    assertEqual(record.actor_type, 'HUMAN');
    assertEqual(record.status, 'ACTIVE');
});

test('create() sets __runtime to RT-01', () => {
    const record = ActorProfile.create(makeValidActorProfile());
    assertEqual(record.__runtime, 'RT-01');
});

test('create() sets __baseline to APEX-CONSTITUTION-v1.0', () => {
    const record = ActorProfile.create(makeValidActorProfile());
    assertEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
});

test('actor_type HUMAN is valid (corrected from recomputed roadmap which listed FOUNDER)', () => {
    const record = ActorProfile.create(makeValidActorProfile({ actor_type: 'HUMAN' }));
    assertEqual(record.actor_type, 'HUMAN');
});

test('actor_type AGENT is valid (APEX agents emit with AGENT)', () => {
    const record = ActorProfile.create(makeValidActorProfile({ actor_type: 'AGENT', actor_id: 'AGENT-001' }));
    assertEqual(record.actor_type, 'AGENT');
});

test('actor_type FOUNDER (invalid) is rejected by create()', () => {
    let threw = false;
    try { ActorProfile.create(makeValidActorProfile({ actor_type: 'FOUNDER' })); }
    catch { threw = true; }
    assert(threw, 'FOUNDER is not a valid actor_type enum value — must throw');
});

test('status ACTIVE is valid', () => {
    const record = ActorProfile.create(makeValidActorProfile({ status: 'ACTIVE' }));
    assertEqual(record.status, 'ACTIVE');
});

test('status CANDIDATE is valid', () => {
    const record = ActorProfile.create(makeValidActorProfile({ status: 'CANDIDATE' }));
    assertEqual(record.status, 'CANDIDATE');
});

test('status SUSPENDED is valid', () => {
    const record = ActorProfile.create(makeValidActorProfile({ status: 'SUSPENDED' }));
    assertEqual(record.status, 'SUSPENDED');
});

test('status TERMINATED is valid', () => {
    const record = ActorProfile.create(makeValidActorProfile({ status: 'TERMINATED' }));
    assertEqual(record.status, 'TERMINATED');
});

// ── ActorProfile field validation ────────────────────────────────────────────
console.log('\nActorProfile — field validation');

test('display_name from profile.identity.name accepted', () => {
    const record = ActorProfile.create(makeValidActorProfile({ display_name: 'Arwulo Ngala' }));
    assertEqual(record.display_name, 'Arwulo Ngala');
});

test('display_name fallback APEX Founder accepted', () => {
    const record = ActorProfile.create(makeValidActorProfile({ display_name: 'APEX Founder' }));
    assertEqual(record.display_name, 'APEX Founder');
});

test('registered_at is valid ISO 8601', () => {
    const ts = new Date().toISOString();
    const record = ActorProfile.create(makeValidActorProfile({ registered_at: ts }));
    assert(!isNaN(Date.parse(record.registered_at)), 'registered_at must parse as valid date');
});

test('create() rejects missing actor_id', () => {
    let threw = false;
    try { const { actor_id: _omit, ...rest } = makeValidActorProfile(); ActorProfile.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing actor_id must throw');
});

test('create() rejects missing display_name', () => {
    let threw = false;
    try { const { display_name: _omit, ...rest } = makeValidActorProfile(); ActorProfile.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing display_name must throw');
});

// ── ActorProfile.validate() ──────────────────────────────────────────────────
console.log('\nActorProfile.validate()');

test('validate() returns valid:true for compliant ACTIVE record', () => {
    const result = ActorProfile.validate(makeValidActorProfile());
    assertEqual(result.valid, true, `validate() must return valid:true, got: ${JSON.stringify(result)}`);
});

test('validate() returns valid:false for missing required field', () => {
    const { registered_at: _omit, ...rest } = makeValidActorProfile();
    const result = ActorProfile.validate(rest);
    assertEqual(result.valid, false, 'missing registered_at must be invalid');
});

test('validate() returns valid:false for invalid status enum', () => {
    const result = ActorProfile.validate(makeValidActorProfile({ status: 'RETIRED' }));
    assertEqual(result.valid, false, 'invalid status must be invalid');
});

// ── Module integrity ─────────────────────────────────────────────────────────
console.log('\nModule integrity');

test('profile.js exports unchanged — 6 functions present', () => {
    const p = require('../lib/founder/profile');
    const expected = ['load', 'invalidate', 'getSection', 'getCoreValueKeywords', 'getAntiGoals', 'getProtectedPeople'];
    for (const fn of expected) {
        assert(typeof p[fn] === 'function', `missing export: ${fn}`);
    }
    assertEqual(Object.keys(p).length, expected.length, 'exactly 6 exports expected');
});

test('ActorProfile type is frozen (constitutional immutability)', () => {
    assert(Object.isFrozen(ActorProfile), 'ActorProfile must be frozen');
});

test('ActorProfile deletion_policy is PROHIBITED (D8 PROH-4)', () => {
    assertEqual(ActorProfile.CONSTITUTIONAL.deletion_policy, 'PROHIBITED');
});

test('ActorProfile runtime_id is RT-01', () => {
    assertEqual(ActorProfile.CONSTITUTIONAL.runtime_id, 'RT-01');
});

test('ActorProfile d8_canonical_type is 1 (first D8 canonical object)', () => {
    assertEqual(ActorProfile.CONSTITUTIONAL.d8_canonical_type, 1);
});

test('identity-record.js module is frozen', () => {
    const ir = require('../lib/constitutional-types/identity-record');
    assert(Object.isFrozen(ir), 'identity-record module.exports must be frozen');
});

// ── Optional fields (Wave 2 deferred) ───────────────────────────────────────
console.log('\nOptional fields — Wave 2 deferred');

test('structural_identity_ref is optional (not required in schema)', () => {
    const result = ActorProfile.validate(makeValidActorProfile());
    assertEqual(result.valid, true, 'record without structural_identity_ref must be valid');
});

test('provenance_chain_ref is optional (not required in schema)', () => {
    const result = ActorProfile.validate(makeValidActorProfile());
    assertEqual(result.valid, true, 'record without provenance_chain_ref must be valid');
});

test('constitutional_era is optional (not required in schema)', () => {
    const result = ActorProfile.validate(makeValidActorProfile());
    assertEqual(result.valid, true, 'record without constitutional_era must be valid');
});

// ── Fire-and-forget emission does not throw ──────────────────────────────────
console.log('\nFire-and-forget — emission infrastructure');

testAsync('ActorProfile.create() can be called inside setImmediate without throw', async () => {
    let threw = false;
    setImmediate(async () => {
        try {
            ActorProfile.create(makeValidActorProfile({ actor_id: 'FOUNDER-APEX-TEST' }));
        } catch {
            threw = true;
        }
    });
    await drain();
    assert(!threw, 'ActorProfile.create() inside setImmediate must not throw');
});

// ── Summary ─────────────────────────────────────────────────────────────────
Promise.resolve().then(async () => {
    await drain();
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
});
