'use strict';
// tests/domain-profile-constitutional.test.js — W2-06 DomainProfile + DomainAuthorityRecord wiring tests

const { DomainAuthorityRecord, DomainProfile } = require('../lib/constitutional-types/domain-profile');
const { DOMAINS } = require('../lib/registry/universe/domain-entities');

// ── Minimal test harness ─────────────────────────────────────────────────────
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

function drain() { return new Promise(resolve => setImmediate(resolve)); }

// ── Helpers ──────────────────────────────────────────────────────────────────

const DOM_1 = DOMAINS[0]; // DOM-000001 Civilisation

function makeValidDAR(overrides = {}) {
    return {
        dar_id:                  'dar-' + DOM_1.id,
        domain_id:               DOM_1.id,
        air_1_authority_holders: [],
        air_2_authority_holders: [],
        air_3_authority_holders: [],
        air_4_authority_holders: [],
        air_5_authority_holders: [],
        air_compliance_status:   'NOT_ESTABLISHED',
        last_updated_at:         new Date().toISOString(),
        ...overrides,
    };
}

function makeValidDP(overrides = {}) {
    const darId = 'dar-' + DOM_1.id;
    return {
        domain_profile_id:       'dp-' + DOM_1.id,
        domain_id:               DOM_1.id,
        domain_name:             DOM_1.name,
        reality_context:         DOM_1.description,
        internal_representation: DOM_1.purpose,
        authority_record_ref:    darId,
        knowledge_status:        'NOT_ESTABLISHED',
        projection_status:       'NOT_ESTABLISHED',
        last_updated_at:         new Date().toISOString(),
        ...overrides,
    };
}

// ── DomainAuthorityRecord.create() — W2-06 field values ──────────────────────
console.log('\nDomainAuthorityRecord.create() — W2-06 field values');

test('create() succeeds with W2-06 DAR field values for DOM-000001', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assertEqual(dar.__type, 'DomainAuthorityRecord');
    assertEqual(dar.domain_id, 'DOM-000001');
});

test('create() sets __runtime to RT-15', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assertEqual(dar.__runtime, 'RT-15');
});

test('create() sets __baseline to APEX-CONSTITUTION-v1.0', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assertEqual(dar.__baseline, 'APEX-CONSTITUTION-v1.0');
});

test('dar_id format is deterministic: dar-DOM-000001', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assertEqual(dar.dar_id, 'dar-DOM-000001');
});

test('air_1 through air_5 arrays are empty (RT-02 not yet wired — honest Wave 2 state)', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assert(Array.isArray(dar.air_1_authority_holders), 'air_1 must be array');
    assert(Array.isArray(dar.air_2_authority_holders), 'air_2 must be array');
    assert(Array.isArray(dar.air_3_authority_holders), 'air_3 must be array');
    assert(Array.isArray(dar.air_4_authority_holders), 'air_4 must be array');
    assert(Array.isArray(dar.air_5_authority_holders), 'air_5 must be array');
    assertEqual(dar.air_1_authority_holders.length, 0, 'air_1 must be empty in Wave 2');
    assertEqual(dar.air_5_authority_holders.length, 0, 'air_5 must be empty in Wave 2');
});

test('air_compliance_status is NOT_ESTABLISHED (honest: no holders assigned)', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assertEqual(dar.air_compliance_status, 'NOT_ESTABLISHED');
});

test('last_updated_at is valid ISO 8601', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assert(!isNaN(Date.parse(dar.last_updated_at)), 'last_updated_at must be valid date');
});

test('DAR domain_id matches source domain', () => {
    const dar = DomainAuthorityRecord.create(makeValidDAR());
    assertEqual(dar.domain_id, DOM_1.id);
});

// ── DomainAuthorityRecord field validation ────────────────────────────────────
console.log('\nDomainAuthorityRecord — field validation');

test('create() rejects missing dar_id', () => {
    let threw = false;
    try { const { dar_id: _omit, ...rest } = makeValidDAR(); DomainAuthorityRecord.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing dar_id must throw');
});

test('create() rejects missing domain_id', () => {
    let threw = false;
    try { const { domain_id: _omit, ...rest } = makeValidDAR(); DomainAuthorityRecord.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing domain_id must throw');
});

test('create() rejects missing air_compliance_status', () => {
    let threw = false;
    try { const { air_compliance_status: _omit, ...rest } = makeValidDAR(); DomainAuthorityRecord.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing air_compliance_status must throw');
});

test('create() rejects non-array air_1_authority_holders', () => {
    let threw = false;
    try { DomainAuthorityRecord.create(makeValidDAR({ air_1_authority_holders: 'invalid' })); }
    catch { threw = true; }
    assert(threw, 'non-array air_1_authority_holders must throw');
});

test('create() rejects missing last_updated_at', () => {
    let threw = false;
    try { const { last_updated_at: _omit, ...rest } = makeValidDAR(); DomainAuthorityRecord.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing last_updated_at must throw');
});

// ── DomainAuthorityRecord.validate() ─────────────────────────────────────────
console.log('\nDomainAuthorityRecord.validate()');

test('validate() returns valid:true for compliant W2-06 DAR record', () => {
    const result = DomainAuthorityRecord.validate(makeValidDAR());
    assertEqual(result.valid, true, `validate() must return valid:true, got: ${JSON.stringify(result)}`);
});

test('validate() returns valid:false for missing required field', () => {
    const { dar_id: _omit, ...rest } = makeValidDAR();
    const result = DomainAuthorityRecord.validate(rest);
    assertEqual(result.valid, false, 'missing dar_id must be invalid');
});

test('validate() returns valid:false for non-array AIR field', () => {
    const result = DomainAuthorityRecord.validate(makeValidDAR({ air_3_authority_holders: 'not-array' }));
    assertEqual(result.valid, false, 'non-array AIR field must be invalid');
});

// ── DomainProfile.create() — W2-06 field values ──────────────────────────────
console.log('\nDomainProfile.create() — W2-06 field values');

test('create() succeeds with W2-06 DomainProfile field values for DOM-000001', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.__type, 'DomainProfile');
    assertEqual(dp.domain_id, 'DOM-000001');
});

test('create() sets __runtime to RT-15', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.__runtime, 'RT-15');
});

test('create() sets __baseline to APEX-CONSTITUTION-v1.0', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.__baseline, 'APEX-CONSTITUTION-v1.0');
});

test('domain_name matches source domain name from DOMAINS array', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.domain_name, DOM_1.name);
    assertEqual(dp.domain_name, 'Civilisation');
});

test('reality_context uses dom.description (honest: direct from domain-entities.js)', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.reality_context, DOM_1.description);
});

test('internal_representation uses dom.purpose (honest: authoritative purpose statement)', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.internal_representation, DOM_1.purpose);
});

test('authority_record_ref is dar-DOM-000001 (matches DomainAuthorityRecord.dar_id)', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.authority_record_ref, 'dar-DOM-000001');
});

test('knowledge_status is NOT_ESTABLISHED (honest: RT-10 not yet wired)', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.knowledge_status, 'NOT_ESTABLISHED');
});

test('projection_status is NOT_ESTABLISHED (honest: RT-13/RT-14 not yet wired)', () => {
    const dp = DomainProfile.create(makeValidDP());
    assertEqual(dp.projection_status, 'NOT_ESTABLISHED');
});

// ── DomainProfile field validation ────────────────────────────────────────────
console.log('\nDomainProfile — field validation');

test('create() rejects missing authority_record_ref', () => {
    let threw = false;
    try { const { authority_record_ref: _omit, ...rest } = makeValidDP(); DomainProfile.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing authority_record_ref must throw');
});

test('create() rejects missing domain_id', () => {
    let threw = false;
    try { const { domain_id: _omit, ...rest } = makeValidDP(); DomainProfile.create(rest); }
    catch { threw = true; }
    assert(threw, 'missing domain_id must throw');
});

// ── DomainProfile.validate() ──────────────────────────────────────────────────
console.log('\nDomainProfile.validate()');

test('validate() returns valid:true for compliant W2-06 DomainProfile record', () => {
    const result = DomainProfile.validate(makeValidDP());
    assertEqual(result.valid, true, `validate() must return valid:true, got: ${JSON.stringify(result)}`);
});

test('validate() returns valid:false for missing required field', () => {
    const { domain_name: _omit, ...rest } = makeValidDP();
    const result = DomainProfile.validate(rest);
    assertEqual(result.valid, false, 'missing domain_name must be invalid');
});

// ── 12-domain emission loop ───────────────────────────────────────────────────
console.log('\n12-domain emission loop');

test('DOMAINS array has exactly 12 entries (DOM-000001 through DOM-000012)', () => {
    assertEqual(DOMAINS.length, 12, `expected 12 domains, got ${DOMAINS.length}`);
});

test('all 12 DOMAINS entries produce a valid DomainAuthorityRecord', () => {
    let allValid = true;
    const errors = [];
    for (const dom of DOMAINS) {
        const result = DomainAuthorityRecord.validate({
            dar_id:                  'dar-' + dom.id,
            domain_id:               dom.id,
            air_1_authority_holders: [],
            air_2_authority_holders: [],
            air_3_authority_holders: [],
            air_4_authority_holders: [],
            air_5_authority_holders: [],
            air_compliance_status:   'NOT_ESTABLISHED',
            last_updated_at:         new Date().toISOString(),
        });
        if (!result.valid) { allValid = false; errors.push(`${dom.id}: ${result.errors.join('; ')}`); }
    }
    assert(allValid, 'All 12 DARs must be valid. Failures: ' + errors.join(' | '));
});

test('all 12 DOMAINS entries produce a valid DomainProfile', () => {
    let allValid = true;
    const errors = [];
    for (const dom of DOMAINS) {
        const result = DomainProfile.validate({
            domain_profile_id:       'dp-' + dom.id,
            domain_id:               dom.id,
            domain_name:             dom.name,
            reality_context:         dom.description,
            internal_representation: dom.purpose,
            authority_record_ref:    'dar-' + dom.id,
            knowledge_status:        'NOT_ESTABLISHED',
            projection_status:       'NOT_ESTABLISHED',
            last_updated_at:         new Date().toISOString(),
        });
        if (!result.valid) { allValid = false; errors.push(`${dom.id}: ${result.errors.join('; ')}`); }
    }
    assert(allValid, 'All 12 DomainProfiles must be valid. Failures: ' + errors.join(' | '));
});

test('authority_record_ref is consistent with dar_id across all 12 domains', () => {
    for (const dom of DOMAINS) {
        const darId = 'dar-' + dom.id;
        const dar = DomainAuthorityRecord.create({
            dar_id: darId, domain_id: dom.id,
            air_1_authority_holders: [], air_2_authority_holders: [],
            air_3_authority_holders: [], air_4_authority_holders: [],
            air_5_authority_holders: [], air_compliance_status: 'NOT_ESTABLISHED',
            last_updated_at: new Date().toISOString(),
        });
        const dp = DomainProfile.create({
            domain_profile_id: 'dp-' + dom.id, domain_id: dom.id, domain_name: dom.name,
            reality_context: dom.description, internal_representation: dom.purpose,
            authority_record_ref: darId,
            knowledge_status: 'NOT_ESTABLISHED', projection_status: 'NOT_ESTABLISHED',
            last_updated_at: new Date().toISOString(),
        });
        assertEqual(dar.dar_id, dp.authority_record_ref,
            `${dom.id}: DomainProfile.authority_record_ref must match DomainAuthorityRecord.dar_id`);
    }
});

test('24 constitutional records can be created from 12 domains (12 DAR + 12 DP)', () => {
    let count = 0;
    for (const dom of DOMAINS) {
        const ts = new Date().toISOString();
        const darId = 'dar-' + dom.id;
        DomainAuthorityRecord.create({ dar_id: darId, domain_id: dom.id,
            air_1_authority_holders: [], air_2_authority_holders: [],
            air_3_authority_holders: [], air_4_authority_holders: [],
            air_5_authority_holders: [], air_compliance_status: 'NOT_ESTABLISHED',
            last_updated_at: ts });
        count++;
        DomainProfile.create({ domain_profile_id: 'dp-' + dom.id, domain_id: dom.id,
            domain_name: dom.name, reality_context: dom.description,
            internal_representation: dom.purpose, authority_record_ref: darId,
            knowledge_status: 'NOT_ESTABLISHED', projection_status: 'NOT_ESTABLISHED',
            last_updated_at: ts });
        count++;
    }
    assertEqual(count, 24, `expected 24 constitutional records, got ${count}`);
});

// ── Module integrity ──────────────────────────────────────────────────────────
console.log('\nModule integrity');

test('lib/registry/universe/index.js exports unchanged — { inject } only', () => {
    const u = require('../lib/registry/universe/index');
    assert(typeof u.inject === 'function', 'inject must be a function');
    assertEqual(Object.keys(u).length, 1, 'exactly 1 export expected');
});

test('DomainAuthorityRecord type is frozen (constitutional immutability)', () => {
    assert(Object.isFrozen(DomainAuthorityRecord), 'DomainAuthorityRecord must be frozen');
});

test('DomainProfile type is frozen (constitutional immutability)', () => {
    assert(Object.isFrozen(DomainProfile), 'DomainProfile must be frozen');
});

test('DomainAuthorityRecord deletion_policy is PROHIBITED', () => {
    assertEqual(DomainAuthorityRecord.CONSTITUTIONAL.deletion_policy, 'PROHIBITED');
});

test('DomainProfile deletion_policy is PROHIBITED', () => {
    assertEqual(DomainProfile.CONSTITUTIONAL.deletion_policy, 'PROHIBITED');
});

test('domain-profile.js module is frozen', () => {
    const dp = require('../lib/constitutional-types/domain-profile');
    assert(Object.isFrozen(dp), 'domain-profile module.exports must be frozen');
});

// ── Fire-and-forget emission infrastructure ───────────────────────────────────
console.log('\nFire-and-forget — emission infrastructure');

testAsync('DAR and DomainProfile.create() can be called inside setImmediate without throw', async () => {
    let threw = false;
    setImmediate(async () => {
        try {
            const ts = new Date().toISOString();
            const darId = 'dar-DOM-000001-test';
            DomainAuthorityRecord.create({
                dar_id: darId, domain_id: 'DOM-000001',
                air_1_authority_holders: [], air_2_authority_holders: [],
                air_3_authority_holders: [], air_4_authority_holders: [],
                air_5_authority_holders: [], air_compliance_status: 'NOT_ESTABLISHED',
                last_updated_at: ts,
            });
            DomainProfile.create({
                domain_profile_id: 'dp-DOM-000001-test', domain_id: 'DOM-000001',
                domain_name: 'Civilisation', reality_context: 'test-context',
                internal_representation: 'test-representation', authority_record_ref: darId,
                knowledge_status: 'NOT_ESTABLISHED', projection_status: 'NOT_ESTABLISHED',
                last_updated_at: ts,
            });
        } catch { threw = true; }
    });
    await drain();
    assert(!threw, 'RT-15 create() calls inside setImmediate must not throw');
});

// ── Summary ───────────────────────────────────────────────────────────────────
Promise.resolve().then(async () => {
    await drain();
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
});
