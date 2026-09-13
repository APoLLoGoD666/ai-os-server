'use strict';
// tests/inference-protocol-registry.test.js
// T3-P4 — InferenceProtocol Bootstrap Registry: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; T3-P4-PHASE-0-AUDIT.md; R10-v1.1 RS-10.2; RT10-INV-3.

const assert = require('assert');

const registry = require('../lib/inference/inference-protocol-registry');
const { InferenceProtocol } = require('../lib/constitutional-types/learning-record');
const { DOMAIN_MAP }         = require('../civilisation/domain-loader');

const DOMAIN_IDS = Object.keys(DOMAIN_MAP); // 12 entries

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

console.log('\nInferenceProtocol Bootstrap Registry');

// 1 — Registry integrity: exactly 12 records (one per domain; no type dimension)
test('registry contains exactly 12 protocols (one per constitutional domain)', () => {
    assert.strictEqual(registry.listProtocols().length, 12);
});

// 2 — Domain coverage: all 12 domains have a protocol
test('all 12 canonical domains have a registered InferenceProtocol', () => {
    for (const domId of DOMAIN_IDS) {
        const p = registry.getProtocolForDomain(domId);
        assert(p !== null, `InferenceProtocol missing for ${domId}`);
        assert.strictEqual(p.protocol_id, `IP-${domId}-v1.0`);
    }
});

// 3 — EpistemicProtocol type has no protocol_type field — confirm absence
test('no protocol record has a protocol_type field (InferenceProtocol schema has none)', () => {
    for (const p of registry.listProtocols()) {
        assert.strictEqual(p.protocol_type, undefined,
            `${p.protocol_id}: protocol_type must be absent from InferenceProtocol records`);
    }
});

// 4 — InferenceProtocol.validate() passes for every record
test('every bootstrapped record passes InferenceProtocol.validate()', () => {
    for (const p of registry.listProtocols()) {
        const { valid, errors } = InferenceProtocol.validate(p);
        assert(valid, `${p.protocol_id} failed validation: ${errors.join('; ')}`);
    }
});

// 5 — Required field presence
test('every record has all 5 required InferenceProtocol fields', () => {
    const required = ['protocol_id','protocol_version','protocol_description','registration_status','registration_timestamp'];
    for (const p of registry.listProtocols()) {
        for (const field of required) {
            assert(p[field] !== undefined && p[field] !== null && p[field] !== '',
                `${p.protocol_id} missing required field: ${field}`);
        }
    }
});

// 6 — Field value correctness
test('all records have protocol_version "1.0"', () => {
    for (const p of registry.listProtocols()) {
        assert.strictEqual(p.protocol_version, '1.0', `${p.protocol_id}: expected protocol_version 1.0`);
    }
});

test('all records have registration_status "CURRENT"', () => {
    for (const p of registry.listProtocols()) {
        assert.strictEqual(p.registration_status, 'CURRENT',
            `${p.protocol_id}: expected CURRENT`);
    }
});

test('all records have registration_status within enum REGISTERED|CURRENT|SUPERSEDED', () => {
    const valid = ['REGISTERED', 'CURRENT', 'SUPERSEDED'];
    for (const p of registry.listProtocols()) {
        assert(valid.includes(p.registration_status),
            `${p.protocol_id}: invalid registration_status '${p.registration_status}'`);
    }
});

test('all records have valid ISO 8601 registration_timestamp', () => {
    for (const p of registry.listProtocols()) {
        const ms = Date.parse(p.registration_timestamp);
        assert(!Number.isNaN(ms),
            `${p.protocol_id}: registration_timestamp is not a valid ISO timestamp`);
    }
});

test('protocol_id format is IP-{DOMAIN_ID}-v1.0', () => {
    for (const p of registry.listProtocols()) {
        assert(p.protocol_id.startsWith('IP-DOM-'),
            `${p.protocol_id}: must start with IP-DOM-`);
        assert(p.protocol_id.endsWith('-v1.0'),
            `${p.protocol_id}: must end with -v1.0`);
    }
});

test('protocol_ids are unique across all 12 records', () => {
    const ids = registry.listProtocols().map(p => p.protocol_id);
    const unique = new Set(ids);
    assert.strictEqual(unique.size, 12, `Expected 12 unique IDs, got ${unique.size}`);
});

// 7 — Export freezing
test('module exports object is frozen', () => {
    assert(Object.isFrozen(registry), 'module.exports must be frozen');
});

test('every record returned by listProtocols() is frozen', () => {
    for (const p of registry.listProtocols()) {
        assert(Object.isFrozen(p), `${p.protocol_id}: record must be frozen`);
    }
});

test('every record returned by getProtocolForDomain() is frozen', () => {
    for (const domId of DOMAIN_IDS) {
        const p = registry.getProtocolForDomain(domId);
        assert(Object.isFrozen(p), `${p.protocol_id}: getProtocolForDomain result must be frozen`);
    }
});

test('getProtocol() result is frozen', () => {
    const p = registry.getProtocol('IP-DOM-000001-v1.0');
    assert(Object.isFrozen(p), 'getProtocol result must be frozen');
});

// 8 — Null-safe behavior for unknown inputs
test('getProtocol(unknown) returns null', () => {
    assert.strictEqual(registry.getProtocol('IP-NONEXISTENT'), null);
    assert.strictEqual(registry.getProtocol(''), null);
    assert.strictEqual(registry.getProtocol(undefined), null);
});

test('getProtocolForDomain(unknown domain) returns null', () => {
    assert.strictEqual(registry.getProtocolForDomain('DOM-999999'), null);
    assert.strictEqual(registry.getProtocolForDomain(''), null);
});

test('getProtocolForDomain(non-string) returns null', () => {
    assert.strictEqual(registry.getProtocolForDomain(null), null);
    assert.strictEqual(registry.getProtocolForDomain(42), null);
    assert.strictEqual(registry.getProtocolForDomain(undefined), null);
});

// 9 — isRegistered() correctness
test('isRegistered() returns true for all 12 known protocol IDs', () => {
    for (const domId of DOMAIN_IDS) {
        const id = `IP-${domId}-v1.0`;
        assert(registry.isRegistered(id), `isRegistered should be true for ${id}`);
    }
});

test('isRegistered() returns false for unknown IDs', () => {
    assert.strictEqual(registry.isRegistered('IP-FAKE'), false);
    assert.strictEqual(registry.isRegistered(''), false);
    assert.strictEqual(registry.isRegistered(undefined), false);
});

// 10 — Registry immutability: mutation attempt must not corrupt state
test('mutation attempt on returned record does not corrupt registry', () => {
    const p = registry.getProtocol('IP-DOM-000001-v1.0');
    assert(Object.isFrozen(p));
    try {
        'use strict';
        p.protocol_version = '999';
    } catch (_) {}
    assert.strictEqual(p.protocol_version, '1.0', 'frozen record must reject mutation');
    // Confirm re-fetch from registry also unchanged
    const p2 = registry.getProtocol('IP-DOM-000001-v1.0');
    assert.strictEqual(p2.protocol_version, '1.0', 'registry internal state unchanged');
});

// 11 — Bootstrap idempotency: require() caching
test('require() caching: re-requiring returns same frozen module instance', () => {
    const r2 = require('../lib/inference/inference-protocol-registry');
    assert.strictEqual(r2, registry, 'module must be cached (Node.js require cache)');
    assert.strictEqual(r2.listProtocols().length, 12);
});

// 12 — RS-10.2 / RS-12 limitation documented in protocol_description
test('every protocol_description references RS-12 Open Question', () => {
    for (const p of registry.listProtocols()) {
        assert(
            p.protocol_description.includes('RS-12'),
            `${p.protocol_id}: protocol_description must reference RS-12`
        );
    }
});

test('every protocol_description references RT10-INV-3', () => {
    for (const p of registry.listProtocols()) {
        assert(
            p.protocol_description.includes('RT10-INV-3'),
            `${p.protocol_id}: protocol_description must reference RT10-INV-3`
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

// 14 — RT10-INV-3 satisfiability: each domain can yield a protocol for DUM formation
test('RT10-INV-3: getProtocolForDomain returns CURRENT protocol for each domain (DUM formation readiness)', () => {
    for (const domId of DOMAIN_IDS) {
        const p = registry.getProtocolForDomain(domId);
        assert(p !== null, `${domId}: no protocol available — RT10-INV-3 cannot be satisfied`);
        assert.strictEqual(p.registration_status, 'CURRENT',
            `${domId}: protocol must be CURRENT for RT10-INV-3`);
        // inference_protocol_ref and inference_protocol_version derivable:
        assert.strictEqual(p.protocol_id, `IP-${domId}-v1.0`);
        assert.strictEqual(p.protocol_version, '1.0');
    }
});

console.log('');
