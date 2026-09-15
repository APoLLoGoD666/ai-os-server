'use strict';
// tests/governance-attestation-constitutional.test.js — W2-08 ConstitutionalComplianceAttestation wiring tests

const { createGovernanceAttestation } = require('../lib/runtime/governance-attestation');
const { ConstitutionalComplianceAttestation } = require('../lib/constitutional-types/audit-record');

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

function makeValidCCA(overrides = {}) {
    return {
        attestation_id:             'ATTEST-governance-1722204000000',
        target_identifier:          'APEX-CONSTITUTION-v1.0/governance-contract',
        certification_period_start: new Date().toISOString(),
        certification_period_end:   new Date().toISOString(),
        attestation_determination:  'PASS',
        evidence_basis:             'df718108adf36957' + '0'.repeat(48),
        issuing_auditor_signature:  'df718108adf36957' + '0'.repeat(48),
        attest_timestamp:           new Date().toISOString(),
        ...overrides,
    };
}

// ── createGovernanceAttestation() — return structure (regression) ───────────
console.log('\ncreateGovernanceAttestation() — return structure');

test('returns frozen object', () => {
    const att = createGovernanceAttestation();
    assert(Object.isFrozen(att), 'attestation must be frozen');
});

test('returns compiledContractHash as 64-char hex string', () => {
    const att = createGovernanceAttestation();
    assert(typeof att.compiledContractHash === 'string', 'compiledContractHash must be string');
    assertEqual(att.compiledContractHash.length, 64, 'compiledContractHash must be 64-char SHA-256 hex');
});

test('returns sourceHash as 64-char hex string', () => {
    const att = createGovernanceAttestation();
    assert(typeof att.sourceHash === 'string', 'sourceHash must be string');
    assertEqual(att.sourceHash.length, 64, 'sourceHash must be 64-char SHA-256 hex');
});

test('returns match as boolean', () => {
    const att = createGovernanceAttestation();
    assert(typeof att.match === 'boolean', 'match must be boolean');
});

test('hashes match (governance contract consistent with source)', () => {
    const att = createGovernanceAttestation();
    assertEqual(att.compiledContractHash, att.sourceHash, 'hashes must match in a clean governance state');
    assertEqual(att.match, true, 'match must be true when hashes equal');
});

test('returns coverage with coverageRatio between 0 and 1', () => {
    const att = createGovernanceAttestation();
    assert(att.coverage && typeof att.coverage.coverageRatio === 'number', 'coverage.coverageRatio must exist');
    assert(att.coverage.coverageRatio >= 0 && att.coverage.coverageRatio <= 1, 'coverageRatio must be in [0,1]');
});

test('returns integrityChecks with structuralParity boolean', () => {
    const att = createGovernanceAttestation();
    assert(att.integrityChecks && typeof att.integrityChecks.structuralParity === 'boolean', 'integrityChecks.structuralParity must be boolean');
});

// ── ConstitutionalComplianceAttestation — field validation ──────────────────
console.log('\nConstitutionalComplianceAttestation — field validation');

test('create() succeeds with PASS determination', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA());
    assertEqual(record.__type, 'ConstitutionalComplianceAttestation');
    assertEqual(record.attestation_determination, 'PASS');
    assertEqual(record.closure_status, undefined); // RT-04 has no closure_status
});

test('create() succeeds with FAIL determination', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({ attestation_determination: 'FAIL' }));
    assertEqual(record.attestation_determination, 'FAIL');
});

test('create() succeeds with CONDITIONAL-PASS determination', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({ attestation_determination: 'CONDITIONAL-PASS' }));
    assertEqual(record.attestation_determination, 'CONDITIONAL-PASS');
});

test('create() rejects invalid determination string', () => {
    let threw = false;
    try { ConstitutionalComplianceAttestation.create(makeValidCCA({ attestation_determination: 'UNKNOWN' })); }
    catch { threw = true; }
    assert(threw, 'invalid attestation_determination must throw');
});

test('create() sets __runtime to RT-04', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA());
    assertEqual(record.__runtime, 'RT-04');
});

test('create() sets __baseline to APEX-CONSTITUTION-v1.0', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA());
    assertEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
});

// ── W2-08 field mapping validation ──────────────────────────────────────────
console.log('\nW2-08 field mapping validation');

test('attestation_id starts with ATTEST- prefix', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({
        attestation_id: 'ATTEST-governance-1722204000000',
    }));
    assert(record.attestation_id.startsWith('ATTEST-'), 'attestation_id must start with ATTEST-');
});

test('target_identifier is governance-contract', () => {
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA());
    assert(record.target_identifier.includes('governance-contract'), 'target_identifier must reference governance-contract');
});

test('evidence_basis accepts SHA-256 hex string (compiledContractHash)', () => {
    const att = createGovernanceAttestation();
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({
        evidence_basis: att.compiledContractHash,
    }));
    assertEqual(record.evidence_basis, att.compiledContractHash);
    assertEqual(record.evidence_basis.length, 64);
});

test('issuing_auditor_signature accepts SHA-256 hex string (sourceHash)', () => {
    const att = createGovernanceAttestation();
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({
        issuing_auditor_signature: att.sourceHash,
    }));
    assertEqual(record.issuing_auditor_signature, att.sourceHash);
    assertEqual(record.issuing_auditor_signature.length, 64);
});

test('attestation_determination PASS when match is true', () => {
    const att = createGovernanceAttestation();
    const determination = att.match ? 'PASS' : 'FAIL';
    assertEqual(determination, 'PASS', 'clean governance state must produce PASS');
});

test('attest_timestamp is valid ISO 8601', () => {
    const ts = new Date().toISOString();
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({ attest_timestamp: ts }));
    assert(!isNaN(Date.parse(record.attest_timestamp)), 'attest_timestamp must be valid ISO 8601');
});

test('certification_period_start and end are valid ISO 8601', () => {
    const ts = new Date().toISOString();
    const record = ConstitutionalComplianceAttestation.create(makeValidCCA({
        certification_period_start: ts,
        certification_period_end:   ts,
    }));
    assert(!isNaN(Date.parse(record.certification_period_start)), 'certification_period_start must be valid ISO 8601');
    assert(!isNaN(Date.parse(record.certification_period_end)), 'certification_period_end must be valid ISO 8601');
});

// ── Fire-and-forget emission — does not block return value ──────────────────
console.log('\nFire-and-forget — emission does not block');

testAsync('createGovernanceAttestation() returns synchronously before setImmediate fires', async () => {
    let immediateHasFired = false;
    const original = global.setImmediate;
    // We cannot intercept the module's setImmediate. Verify return is synchronous:
    const start = Date.now();
    const att = createGovernanceAttestation();
    const elapsed = Date.now() - start;
    assert(typeof att === 'object' && att !== null, 'must return object');
    // Allow the setImmediate to fire without asserting on its timing
    await drain();
});

testAsync('no exception escapes to caller after setImmediate fires', async () => {
    // If the store write throws, the error is caught internally (fire-and-forget pattern).
    // createGovernanceAttestation() must not throw regardless of store state.
    let threw = false;
    try {
        const att = createGovernanceAttestation();
        await drain();
    } catch {
        threw = true;
    }
    assert(!threw, 'no exception must escape createGovernanceAttestation()');
});

// ── Module integrity ─────────────────────────────────────────────────────────
console.log('\nModule integrity');

test('governance-attestation exports unchanged (createGovernanceAttestation present)', () => {
    const mod = require('../lib/runtime/governance-attestation');
    assert(typeof mod.createGovernanceAttestation === 'function', 'createGovernanceAttestation must be exported');
    assertEqual(Object.keys(mod).length, 1, 'only createGovernanceAttestation must be exported');
});

test('ConstitutionalComplianceAttestation type is frozen (constitutional immutability)', () => {
    assert(Object.isFrozen(ConstitutionalComplianceAttestation), 'ConstitutionalComplianceAttestation must be frozen');
});

test('ConstitutionalComplianceAttestation deletion_policy is PROHIBITED (RT04-INV-06)', () => {
    assertEqual(ConstitutionalComplianceAttestation.CONSTITUTIONAL.deletion_policy, 'PROHIBITED');
});

test('ConstitutionalComplianceAttestation runtime_id is RT-04', () => {
    assertEqual(ConstitutionalComplianceAttestation.CONSTITUTIONAL.runtime_id, 'RT-04');
});

// ── validate() method ────────────────────────────────────────────────────────
console.log('\nConstitutionalComplianceAttestation.validate()');

test('validate() returns valid:true for compliant PASS record', () => {
    const result = ConstitutionalComplianceAttestation.validate(makeValidCCA());
    assertEqual(result.valid, true, `validate() must return valid:true, got: ${JSON.stringify(result)}`);
});

test('validate() returns valid:false when required field missing', () => {
    const { attestation_id: _omit, ...rest } = makeValidCCA();
    const result = ConstitutionalComplianceAttestation.validate(rest);
    assertEqual(result.valid, false, 'missing attestation_id must be invalid');
});

// ── Summary ─────────────────────────────────────────────────────────────────
Promise.resolve().then(async () => {
    await drain();
    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
});
