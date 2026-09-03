'use strict';
// tests/epistemic-protocol-registry.test.js
// T3-P3 — EpistemicProtocol Bootstrap Registry: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; T3-P3-PHASE-0-AUDIT.md; R9-v1.0 RS-10 RS-12.

const assert = require('assert');

const registry = require('../lib/epistemics/epistemic-protocol-registry');
const { EpistemicProtocol } = require('../lib/constitutional-types/knowledge-record');
const { DOMAIN_MAP }         = require('../civilisation/domain-loader');

const DOMAIN_IDS    = Object.keys(DOMAIN_MAP);           // 12 entries
const PROTOCOL_TYPES = ['INTERPRETATION', 'INFERENCE', 'VALIDATION'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label, msg) { console.error(`  FAIL  ${label}: ${msg}`); process.exitCode = 1; }

function test(label, fn) {
    try {
        fn();
        pass(label);
    } catch (e) {
        fail(label, e.message);
    }
}

// ── Suite ──────────────────────────────────────────────────────────────────────

console.log('\nEpistemicProtocol Bootstrap Registry');

// 1 — Registry integrity: exactly 36 records
test('registry contains exactly 36 protocols (3 types × 12 domains)', () => {
    assert.strictEqual(registry.listProtocols().length, 36);
});

// 2 — Domain coverage: all 12 domains have all 3 types
test('all 12 domains have INTERPRETATION protocol', () => {
    const interps = registry.listByType('INTERPRETATION');
    assert.strictEqual(interps.length, 12);
    for (const domId of DOMAIN_IDS) {
        const p = registry.getProtocolForDomain(domId, 'INTERPRETATION');
        assert(p !== null, `DOM-000001..012: INTERPRETATION missing for ${domId}`);
        assert.strictEqual(p.protocol_id, `EP-${domId}-INTERP-v1.0`);
    }
});

test('all 12 domains have INFERENCE protocol', () => {
    const inferences = registry.listByType('INFERENCE');
    assert.strictEqual(inferences.length, 12);
    for (const domId of DOMAIN_IDS) {
        const p = registry.getProtocolForDomain(domId, 'INFERENCE');
        assert(p !== null, `INFERENCE missing for ${domId}`);
        assert.strictEqual(p.protocol_id, `EP-${domId}-INFER-v1.0`);
    }
});

test('all 12 domains have VALIDATION protocol', () => {
    const validations = registry.listByType('VALIDATION');
    assert.strictEqual(validations.length, 12);
    for (const domId of DOMAIN_IDS) {
        const p = registry.getProtocolForDomain(domId, 'VALIDATION');
        assert(p !== null, `VALIDATION missing for ${domId}`);
        assert.strictEqual(p.protocol_id, `EP-${domId}-VALID-v1.0`);
    }
});

// 3 — EpistemicProtocol.validate() passes for every record
test('every bootstrapped record passes EpistemicProtocol.validate()', () => {
    for (const p of registry.listProtocols()) {
        const { valid, errors } = EpistemicProtocol.validate(p);
        assert(valid, `${p.protocol_id} failed validation: ${errors.join('; ')}`);
    }
});

// 4 — Required field presence on each record
test('every record has all 6 required EpistemicProtocol fields', () => {
    const required = ['protocol_id','protocol_version','protocol_type','protocol_description','registration_status','registration_timestamp'];
    for (const p of registry.listProtocols()) {
        for (const field of required) {
            assert(p[field] !== undefined && p[field] !== null && p[field] !== '',
                `${p.protocol_id} missing required field: ${field}`);
        }
    }
});

// 5 — Field value correctness
test('all records have protocol_version "1.0"', () => {
    for (const p of registry.listProtocols()) {
        assert.strictEqual(p.protocol_version, '1.0', `${p.protocol_id}: expected protocol_version 1.0`);
    }
});

test('all records have registration_status "CURRENT"', () => {
    for (const p of registry.listProtocols()) {
        assert.strictEqual(p.registration_status, 'CURRENT', `${p.protocol_id}: expected CURRENT`);
    }
});

test('all records have valid ISO 8601 registration_timestamp', () => {
    for (const p of registry.listProtocols()) {
        const ms = Date.parse(p.registration_timestamp);
        assert(!Number.isNaN(ms), `${p.protocol_id}: registration_timestamp is not a valid ISO timestamp`);
    }
});

test('all records have protocol_type within enum INTERPRETATION|INFERENCE|VALIDATION', () => {
    for (const p of registry.listProtocols()) {
        assert(PROTOCOL_TYPES.includes(p.protocol_type),
            `${p.protocol_id}: invalid protocol_type '${p.protocol_type}'`);
    }
});

test('protocol_id format is EP-{DOMAIN_ID}-{TYPE_CODE}-v1.0', () => {
    const TYPE_CODE = { INTERPRETATION: 'INTERP', INFERENCE: 'INFER', VALIDATION: 'VALID' };
    for (const p of registry.listProtocols()) {
        const expected = `EP-${p.protocol_id.split('-INTERP-')[0].split('-INFER-')[0].split('-VALID-')[0].replace('EP-','')}`; // parse domainId
        // Verify by reconstructing from components
        const parts = p.protocol_id.split('-');
        // EP-DOM-000001-INTERP-v1.0 → ['EP','DOM','000001','INTERP','v1.0']
        assert(p.protocol_id.startsWith('EP-DOM-'),
            `${p.protocol_id}: must start with EP-DOM-`);
        assert(p.protocol_id.endsWith('-v1.0'),
            `${p.protocol_id}: must end with -v1.0`);
        assert(p.protocol_id.includes(TYPE_CODE[p.protocol_type]),
            `${p.protocol_id}: must include type code ${TYPE_CODE[p.protocol_type]}`);
    }
});

// 6 — Export freezing
test('module exports object is frozen', () => {
    assert(Object.isFrozen(registry), 'module.exports must be frozen');
});

test('every record returned by listProtocols() is frozen', () => {
    for (const p of registry.listProtocols()) {
        assert(Object.isFrozen(p), `${p.protocol_id}: record must be frozen`);
    }
});

test('every record returned by getProtocol() is frozen', () => {
    for (const domId of DOMAIN_IDS) {
        for (const type of PROTOCOL_TYPES) {
            const p = registry.getProtocolForDomain(domId, type);
            assert(Object.isFrozen(p), `${p.protocol_id}: getProtocolForDomain result must be frozen`);
        }
    }
});

// 7 — listByDomain() coverage
test('listByDomain() returns exactly 3 protocols per domain', () => {
    for (const domId of DOMAIN_IDS) {
        const list = registry.listByDomain(domId);
        assert.strictEqual(list.length, 3, `${domId}: expected 3 protocols, got ${list.length}`);
        const types = list.map(p => p.protocol_type).sort();
        assert.deepStrictEqual(types, ['INFERENCE','INTERPRETATION','VALIDATION'],
            `${domId}: missing protocol types`);
    }
});

// 8 — Null-safe behavior for unknown inputs
test('getProtocol(unknown) returns null', () => {
    assert.strictEqual(registry.getProtocol('EP-NONEXISTENT'), null);
    assert.strictEqual(registry.getProtocol(''), null);
    assert.strictEqual(registry.getProtocol(undefined), null);
});

test('getProtocolForDomain(unknown domain) returns null', () => {
    assert.strictEqual(registry.getProtocolForDomain('DOM-999999', 'INTERPRETATION'), null);
});

test('getProtocolForDomain(unknown type) returns null', () => {
    assert.strictEqual(registry.getProtocolForDomain('DOM-000001', 'UNKNOWN'), null);
    assert.strictEqual(registry.getProtocolForDomain('DOM-000001', ''), null);
});

test('getProtocolForDomain(non-string args) returns null', () => {
    assert.strictEqual(registry.getProtocolForDomain(null, 'INTERPRETATION'), null);
    assert.strictEqual(registry.getProtocolForDomain('DOM-000001', null), null);
});

test('listByDomain(non-string) returns empty array', () => {
    assert.deepStrictEqual(registry.listByDomain(null), []);
    assert.deepStrictEqual(registry.listByDomain(42), []);
});

// 9 — isRegistered() correctness
test('isRegistered() returns true for all 36 known protocol IDs', () => {
    const TYPE_CODE = { INTERPRETATION: 'INTERP', INFERENCE: 'INFER', VALIDATION: 'VALID' };
    for (const domId of DOMAIN_IDS) {
        for (const type of PROTOCOL_TYPES) {
            const id = `EP-${domId}-${TYPE_CODE[type]}-v1.0`;
            assert(registry.isRegistered(id), `isRegistered should be true for ${id}`);
        }
    }
});

test('isRegistered() returns false for unknown IDs', () => {
    assert.strictEqual(registry.isRegistered('EP-FAKE'), false);
    assert.strictEqual(registry.isRegistered(''), false);
    assert.strictEqual(registry.isRegistered(undefined), false);
});

// 10 — Registry immutability: external mutation attempts must not affect state
test('mutation attempt on returned record does not corrupt registry', () => {
    const p = registry.getProtocol('EP-DOM-000001-INTERP-v1.0');
    assert(Object.isFrozen(p));
    // Attempting mutation on a frozen object throws in strict mode
    let threw = false;
    try {
        'use strict';
        p.protocol_version = '999';
    } catch (_) {
        threw = true;
    }
    // Whether it throws or silently fails, the value must not have changed
    assert.strictEqual(p.protocol_version, '1.0', 'frozen record must reject mutation');
});

// 11 — Bootstrap idempotency: re-requiring the module returns same state
test('require() caching: re-requiring returns same frozen module instance', () => {
    const r2 = require('../lib/epistemics/epistemic-protocol-registry');
    assert.strictEqual(r2, registry, 'module must be cached (Node.js require cache)');
    assert.strictEqual(r2.listProtocols().length, 36);
});

// 12 — RS-12 limitation documented in protocol_description
test('every protocol_description references RS-12 Open Question', () => {
    for (const p of registry.listProtocols()) {
        assert(
            p.protocol_description.includes('RS-12'),
            `${p.protocol_id}: protocol_description must reference R9-v1.0 RS-12`
        );
    }
});

// 13 — superseded_by_version is absent (all protocols are CURRENT)
test('no bootstrap protocol has superseded_by_version set', () => {
    for (const p of registry.listProtocols()) {
        assert(p.superseded_by_version === undefined || p.superseded_by_version === null,
            `${p.protocol_id}: superseded_by_version must be absent for CURRENT protocols`);
    }
});

console.log('');
