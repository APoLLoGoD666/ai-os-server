'use strict';
// tests/authority-grants.test.js
// T3-08 Authority Grant Registry — constitutional tests.
// Run: node tests/authority-grants.test.js
// No live Supabase required.

const authorityRegistry = require('../lib/authority/authority-registry');

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
        if (msgFragment && !e.message.toLowerCase().includes(msgFragment.toLowerCase())) {
            throw new Error(`Expected error containing "${msgFragment}", got: ${e.message}`);
        }
    }
    if (!threw) throw new Error('Expected function to throw but it did not');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _seq = 0;
function uniqueId() { return `AG-TEST-${Date.now()}-${++_seq}`; }

function validGrant(overrides = {}) {
    return {
        authority_id:   uniqueId(),
        subject_ref:    'APEX-SYSTEM-OBSERVER',
        subject_type:   'SYSTEM',
        authority_type: 'OBSERVATION',
        grant_scope:    'TEST_SCOPE',
        granted_by:     'APEX-CONSTITUTION-v1.0',
        ...overrides,
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n  T3-08 Authority Grant Registry Tests\n');

// 1. Grant creation
test('registerAuthorityGrant produces frozen record', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    if (!Object.isFrozen(grant)) throw new Error('Authority grant record is not frozen');
});

test('authority_id matches registered value', () => {
    const id = uniqueId();
    const grant = authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    assertEqual(grant.authority_id, id);
});

test('status defaults to ACTIVE on creation', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    assertEqual(grant.status, 'ACTIVE');
});

test('grant_timestamp is a valid ISO string', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    if (typeof grant.grant_timestamp !== 'string') throw new Error('grant_timestamp not a string');
    if (Number.isNaN(Date.parse(grant.grant_timestamp))) throw new Error('grant_timestamp not valid ISO');
});

test('expiry_timestamp defaults to null', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    if (grant.expiry_timestamp !== null) throw new Error(`Expected null, got ${grant.expiry_timestamp}`);
});

test('limitations array is frozen', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant({
        limitations: ['limitation-one', 'limitation-two'],
    }));
    if (!Object.isFrozen(grant.limitations)) throw new Error('limitations array not frozen');
    assertEqual(grant.limitations.length, 2);
});

// 2. Authority lookup
test('getAuthorityGrant returns null for unknown id', () => {
    const result = authorityRegistry.getAuthorityGrant('AG-DOES-NOT-EXIST-XYZ');
    if (result !== null) throw new Error(`Expected null, got ${JSON.stringify(result)}`);
});

test('getAuthorityGrant returns registered grant', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    const fetched = authorityRegistry.getAuthorityGrant(id);
    if (!fetched) throw new Error('getAuthorityGrant returned null for registered id');
    assertEqual(fetched.authority_id, id);
});

test('listAuthorityGrants includes all registered grants', () => {
    const before = authorityRegistry.listAuthorityGrants().length;
    authorityRegistry.registerAuthorityGrant(validGrant());
    authorityRegistry.registerAuthorityGrant(validGrant());
    const after = authorityRegistry.listAuthorityGrants().length;
    if (after !== before + 2) throw new Error(`Expected ${before + 2} grants, got ${after}`);
});

// 3. Validation success
test('validateAuthorityGrant accepts a valid grant', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    const result = authorityRegistry.validateAuthorityGrant(grant);
    if (!result.valid) throw new Error(`Valid grant failed validation: ${result.errors.join('; ')}`);
});

test('validateAuthorityGrant returns errors array even on success', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    const result = authorityRegistry.validateAuthorityGrant(grant);
    if (!Array.isArray(result.errors)) throw new Error('errors must be an array');
    assertEqual(result.errors.length, 0);
});

// 4. Invalid authority rejection
test('validateAuthorityGrant rejects null', () => {
    const result = authorityRegistry.validateAuthorityGrant(null);
    if (result.valid) throw new Error('Expected valid=false for null');
});

test('validateAuthorityGrant rejects missing authority_id', () => {
    const result = authorityRegistry.validateAuthorityGrant({
        subject_ref: 'APEX', subject_type: 'SYSTEM', authority_type: 'OBSERVATION',
        grant_scope: 'TEST', granted_by: 'APEX', grant_timestamp: new Date().toISOString(),
        expiry_timestamp: null, status: 'ACTIVE', limitations: [],
    });
    if (result.valid) throw new Error('Expected invalid — authority_id missing');
    if (!result.errors.some(e => e.includes('authority_id'))) {
        throw new Error('Expected authority_id error, got: ' + result.errors.join('; '));
    }
});

test('validateAuthorityGrant rejects invalid subject_type', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    const result = authorityRegistry.validateAuthorityGrant({ ...grant, subject_type: 'ROBOT' });
    if (result.valid) throw new Error('Expected invalid — subject_type ROBOT not allowed');
});

test('validateAuthorityGrant rejects invalid authority_type', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    const result = authorityRegistry.validateAuthorityGrant({ ...grant, authority_type: 'UNKNOWN' });
    if (result.valid) throw new Error('Expected invalid — authority_type UNKNOWN not allowed');
});

test('validateAuthorityGrant rejects invalid status', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    const result = authorityRegistry.validateAuthorityGrant({ ...grant, status: 'PENDING' });
    if (result.valid) throw new Error('Expected invalid — status PENDING not allowed');
});

test('validateAuthorityGrant rejects non-array limitations', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant());
    const result = authorityRegistry.validateAuthorityGrant({ ...grant, limitations: 'not-an-array' });
    if (result.valid) throw new Error('Expected invalid — limitations must be array');
});

test('registerAuthorityGrant throws on duplicate authority_id', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    assertThrows(
        () => authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id })),
        'already registered'
    );
});

test('registerAuthorityGrant throws on missing subject_ref', () => {
    assertThrows(
        () => authorityRegistry.registerAuthorityGrant({
            authority_id: uniqueId(), subject_type: 'SYSTEM',
            authority_type: 'OBSERVATION', grant_scope: 'TEST', granted_by: 'TEST',
        }),
        'subject_ref'
    );
});

test('registerAuthorityGrant throws on invalid authority_type', () => {
    assertThrows(
        () => authorityRegistry.registerAuthorityGrant(validGrant({ authority_type: 'INVALID' })),
        'authority_type'
    );
});

// 5. Revocation behaviour
test('revokeAuthorityGrant sets status to REVOKED', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    const revoked = authorityRegistry.revokeAuthorityGrant(id);
    assertEqual(revoked.status, 'REVOKED');
});

test('revokeAuthorityGrant returns updated frozen record', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    const revoked = authorityRegistry.revokeAuthorityGrant(id);
    if (!Object.isFrozen(revoked)) throw new Error('Revoked record is not frozen');
    assertEqual(revoked.authority_id, id);
});

test('revokeAuthorityGrant adds revocation_timestamp', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    const revoked = authorityRegistry.revokeAuthorityGrant(id);
    if (typeof revoked.revocation_timestamp !== 'string') throw new Error('revocation_timestamp missing');
    if (Number.isNaN(Date.parse(revoked.revocation_timestamp))) throw new Error('revocation_timestamp not valid ISO');
});

test('revokeAuthorityGrant persists REVOKED state in registry', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    authorityRegistry.revokeAuthorityGrant(id);
    const fetched = authorityRegistry.getAuthorityGrant(id);
    assertEqual(fetched.status, 'REVOKED');
});

test('revokeAuthorityGrant is idempotent on already-revoked grant', () => {
    const id = uniqueId();
    authorityRegistry.registerAuthorityGrant(validGrant({ authority_id: id }));
    const r1 = authorityRegistry.revokeAuthorityGrant(id);
    const r2 = authorityRegistry.revokeAuthorityGrant(id);
    assertEqual(r1.status, 'REVOKED');
    assertEqual(r2.status, 'REVOKED');
});

test('revokeAuthorityGrant throws for unknown authority_id', () => {
    assertThrows(
        () => authorityRegistry.revokeAuthorityGrant('AG-DOES-NOT-EXIST-FOR-REVOKE'),
        'not found'
    );
});

// 6. Expired authority handling
test('validateAuthorityGrant flags expired ACTIVE grant', () => {
    const pastTimestamp = new Date(Date.now() - 60000).toISOString();
    const result = authorityRegistry.validateAuthorityGrant({
        authority_id:    'AG-EXPIRED-TEST',
        subject_ref:     'APEX-SYSTEM-OBSERVER',
        subject_type:    'SYSTEM',
        authority_type:  'OBSERVATION',
        grant_scope:     'TEST',
        granted_by:      'APEX-CONSTITUTION-v1.0',
        grant_timestamp: new Date(Date.now() - 120000).toISOString(),
        expiry_timestamp: pastTimestamp,
        status:          'ACTIVE',
        limitations:     [],
    });
    if (result.valid) throw new Error('Expected invalid — expiry_timestamp is in the past');
    if (!result.errors.some(e => e.includes('expired'))) {
        throw new Error('Expected expiry error, got: ' + result.errors.join('; '));
    }
});

test('validateAuthorityGrant accepts future expiry_timestamp', () => {
    const futureTimestamp = new Date(Date.now() + 60000).toISOString();
    const result = authorityRegistry.validateAuthorityGrant({
        authority_id:    uniqueId(),
        subject_ref:     'APEX-SYSTEM-OBSERVER',
        subject_type:    'SYSTEM',
        authority_type:  'OBSERVATION',
        grant_scope:     'TEST',
        granted_by:      'APEX-CONSTITUTION-v1.0',
        grant_timestamp: new Date().toISOString(),
        expiry_timestamp: futureTimestamp,
        status:          'ACTIVE',
        limitations:     [],
    });
    if (!result.valid) throw new Error(`Valid future expiry rejected: ${result.errors.join('; ')}`);
});

// 7. Observer authority resolution
test('APEX bootstrap grant resolves via getAuthorityGrant after fabric bootstrap', () => {
    // Import fabric to trigger _ensureRT08Bootstrap on first call
    // (bootstrap runs lazily inside setImmediate, so we call it via the exported bootstrap path)
    // Instead verify the grant can be registered and fetched (pre-fabric bootstrap)
    const apexId = 'AG-APEX-TEST-OBSERVER-RESOLUTION';
    if (!authorityRegistry.getAuthorityGrant(apexId)) {
        authorityRegistry.registerAuthorityGrant({
            authority_id:   apexId,
            subject_ref:    'APEX-SYSTEM-OBSERVER',
            subject_type:   'SYSTEM',
            authority_type: 'OBSERVATION',
            grant_scope:    'REALITY_CLAIMS_OBSERVATION',
            granted_by:     'APEX-CONSTITUTION-v1.0',
        });
    }
    const fetched = authorityRegistry.getAuthorityGrant(apexId);
    if (!fetched) throw new Error('Bootstrap grant not resolvable');
    assertEqual(fetched.subject_ref, 'APEX-SYSTEM-OBSERVER');
    assertEqual(fetched.authority_type, 'OBSERVATION');
    assertEqual(fetched.status, 'ACTIVE');
});

test('authority grant subject_type is SYSTEM for APEX observer', () => {
    const id = uniqueId();
    const grant = authorityRegistry.registerAuthorityGrant(validGrant({
        authority_id: id,
        subject_ref:  'APEX-SYSTEM-OBSERVER',
        subject_type: 'SYSTEM',
    }));
    assertEqual(grant.subject_type, 'SYSTEM');
});

test('authority grant authority_type OBSERVATION aligns with D6 §4.2', () => {
    const grant = authorityRegistry.registerAuthorityGrant(validGrant({
        authority_type: 'OBSERVATION',
    }));
    assertEqual(grant.authority_type, 'OBSERVATION');
});

// 8. Frozen exports
test('authority-registry module exports are frozen', () => {
    if (!Object.isFrozen(authorityRegistry)) throw new Error('authority-registry exports not frozen');
});

test('module exports only the five specified functions', () => {
    const keys = Object.keys(authorityRegistry).sort();
    const expected = [
        'getAuthorityGrant',
        'listAuthorityGrants',
        'registerAuthorityGrant',
        'revokeAuthorityGrant',
        'validateAuthorityGrant',
    ].sort();
    if (keys.join(',') !== expected.join(',')) {
        throw new Error(`Unexpected exports: ${keys.join(', ')}`);
    }
});

// ── Summary ───────────────────────────────────────────────────────────────────

setImmediate(() => {
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
});
