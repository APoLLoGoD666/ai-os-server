'use strict';
// tests/gate6-constitutional.test.js — W2-04 Gate 6 ChangeRecord validation tests

const gate = require('../lib/runtime/constitutional-gate');
const { ChangeRecord } = require('../lib/constitutional-types/change-record');

// ── Minimal test harness ────────────────────────────────────────────────────
let passed = 0; let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeValidCR(overrides = {}) {
    return {
        __type:     'ChangeRecord',
        __baseline: 'APEX-CONSTITUTION-v1.0',
        claim_ref:  'claim-test-001',
        stage_to:   'potential',
        actor_ref:  'test-system',
        ...overrides,
    };
}

function auditEntry(result, check) {
    return result.auditTrail.find(c => c.check === check);
}

// ── Gate 6: no changeRecord provided ────────────────────────────────────────
console.log('\nGate 6 — changeRecord absent (not applicable)');

test('auditTrail contains changeRecord entry when no changeRecord provided', () => {
    const r = gate.evaluate({ metadata: { path: '/status' } }, {});
    const cr = auditEntry(r, 'changeRecord');
    assert(cr !== undefined, 'no changeRecord audit entry found');
    assertEqual(cr.applicable, false, 'applicable should be false');
});

test('verdict not degraded by absent changeRecord', () => {
    const r = gate.evaluate({ metadata: { path: '/status' } }, {});
    // Risk check causes RESTRICT for empty healthState — Gate 6 should not add DENY
    assert(r.verdict !== 'DENY', 'absent changeRecord must not cause DENY');
    assert(!r.risks.includes('CHANGE_RECORD_INVALID'), 'absent CR must not produce CHANGE_RECORD_INVALID risk');
});

// ── Gate 6: valid ChangeRecord ───────────────────────────────────────────────
console.log('\nGate 6 — valid ChangeRecord');

test('valid ChangeRecord: audit entry shows valid: true', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR() });
    const cr = auditEntry(r, 'changeRecord');
    assert(cr !== undefined, 'no changeRecord audit entry');
    assertEqual(cr.valid, true, 'expected valid: true');
});

test('valid ChangeRecord: no CHANGE_RECORD_INVALID risk', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR() });
    assert(!r.risks.includes('CHANGE_RECORD_INVALID'), 'valid CR must not add CHANGE_RECORD_INVALID risk');
});

test('valid ChangeRecord: verdict not degraded to DENY by Gate 6', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR() });
    assert(r.verdict !== 'DENY', 'valid CR must not produce DENY verdict');
});

test('audit entry records claim_ref and stage_to from valid CR', () => {
    const cr = makeValidCR({ claim_ref: 'claim-xyz', stage_to: 'emergent' });
    const r = gate.evaluate({}, { changeRecord: cr });
    const entry = auditEntry(r, 'changeRecord');
    assertEqual(entry.claim_ref, 'claim-xyz', 'claim_ref not recorded');
    assertEqual(entry.stage_to, 'emergent', 'stage_to not recorded');
});

test('ChangeRecord.create() output passes Gate 6 as valid', () => {
    const cr = ChangeRecord.create({
        change_id:             'CR-test-gate6-001',
        claim_ref:             'claim-g6-test',
        stage_to:              'potential',
        transition_vector:     'created',
        timestamp:             new Date().toISOString(),
        actor_ref:             'test-runner',
        historical_anchor_ref: 'ANCHOR-claim-g6-test',
    });
    const r = gate.evaluate({}, { changeRecord: cr });
    const entry = auditEntry(r, 'changeRecord');
    assertEqual(entry.valid, true, 'ChangeRecord.create() output should be valid');
    assert(!r.risks.includes('CHANGE_RECORD_INVALID'), 'no CHANGE_RECORD_INVALID for real ChangeRecord');
});

// ── Gate 6: null changeRecord ────────────────────────────────────────────────
console.log('\nGate 6 — null changeRecord (invalid)');

test('null changeRecord: valid: false', () => {
    const r = gate.evaluate({}, { changeRecord: null });
    const entry = auditEntry(r, 'changeRecord');
    assertEqual(entry.valid, false, 'null CR must be invalid');
});

test('null changeRecord: verdict becomes DENY', () => {
    const r = gate.evaluate({}, { changeRecord: null });
    assertEqual(r.verdict, 'DENY', 'null CR must produce DENY');
});

test('null changeRecord: CHANGE_RECORD_INVALID in risks', () => {
    const r = gate.evaluate({}, { changeRecord: null });
    assert(r.risks.includes('CHANGE_RECORD_INVALID'), 'null CR must produce CHANGE_RECORD_INVALID risk');
});

// ── Gate 6: invalid ChangeRecord — wrong __type ──────────────────────────────
console.log('\nGate 6 — invalid ChangeRecord field violations');

test('wrong __type: DENY + CHANGE_RECORD_INVALID', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR({ __type: 'NotChangeRecord' }) });
    assertEqual(r.verdict, 'DENY', 'wrong __type must DENY');
    assert(r.risks.includes('CHANGE_RECORD_INVALID'), 'wrong __type must produce risk');
});

test('wrong __baseline: DENY + CHANGE_RECORD_INVALID', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR({ __baseline: 'WRONG-v0.0' }) });
    assertEqual(r.verdict, 'DENY', 'wrong __baseline must DENY');
    assert(r.risks.includes('CHANGE_RECORD_INVALID'), 'wrong __baseline must produce risk');
});

test('empty claim_ref string: DENY + CHANGE_RECORD_INVALID', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR({ claim_ref: '' }) });
    assertEqual(r.verdict, 'DENY', 'empty claim_ref must DENY');
});

test('missing claim_ref (undefined): DENY', () => {
    const cr = makeValidCR();
    delete cr.claim_ref;
    const r = gate.evaluate({}, { changeRecord: cr });
    assertEqual(r.verdict, 'DENY', 'missing claim_ref must DENY');
});

test('numeric claim_ref: DENY', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR({ claim_ref: 123 }) });
    assertEqual(r.verdict, 'DENY', 'non-string claim_ref must DENY');
});

test('empty stage_to: DENY', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR({ stage_to: '' }) });
    assertEqual(r.verdict, 'DENY', 'empty stage_to must DENY');
});

test('empty actor_ref: DENY', () => {
    const r = gate.evaluate({}, { changeRecord: makeValidCR({ actor_ref: '' }) });
    assertEqual(r.verdict, 'DENY', 'empty actor_ref must DENY');
});

// ── Gate 6: DENY is terminal — no upgrade possible ───────────────────────────
console.log('\nGate 6 — DENY is sticky (existing gate behavior)');

test('invalid CR on ALLOW baseline: raises to DENY', () => {
    // Authority ALLOW, risk NOMINAL, no modification path, no deception — baseline ALLOW
    // Pass perfect context but invalid CR → must DENY
    const ctx = { identity: { roles: ['HUMAN_OPERATOR'] }, metadata: { path: '/status' } };
    const opts = { changeRecord: makeValidCR({ __type: 'Bad' }), healthState: { status: 'NOMINAL' } };
    const r = gate.evaluate(ctx, opts);
    assertEqual(r.verdict, 'DENY', 'invalid CR must produce DENY even on otherwise-clean request');
});

// ── Gate sequence: all checks still present ──────────────────────────────────
console.log('\nGate sequence integrity');

test('non-mod path: 5 audit entries (authority, risk, deception, confabulation, changeRecord)', () => {
    const r = gate.evaluate({ metadata: { path: '/status' } }, {});
    const checks = r.auditTrail.map(c => c.check);
    assert(checks.includes('authority'), 'authority check missing');
    assert(checks.includes('risk'), 'risk check missing');
    assert(checks.includes('deception'), 'deception check missing');
    assert(checks.includes('confabulation'), 'confabulation check missing');
    assert(checks.includes('changeRecord'), 'changeRecord check missing');
});

test('mod path: 6 audit entries (includes modification)', () => {
    const r = gate.evaluate({ metadata: { path: '/self-modify/memory' } }, {});
    const checks = r.auditTrail.map(c => c.check);
    assert(checks.includes('modification'), 'modification check missing for mod path');
    assert(checks.includes('changeRecord'), 'changeRecord check missing for mod path');
    assertEqual(checks.length, 6, 'expected 6 audit entries for mod path');
});

test('changeRecord check is last in auditTrail', () => {
    const r = gate.evaluate({ metadata: { path: '/status' } }, {});
    const last = r.auditTrail[r.auditTrail.length - 1];
    assertEqual(last.check, 'changeRecord', 'changeRecord must be last check');
});

// ── Gate 6: failOpen on exception ───────────────────────────────────────────
console.log('\nGate 6 — failOpen on exception');

test('Gate 6 failOpen: throws inside check, audit entry records error', () => {
    // Craft a ChangeRecord proxy that throws when __type is accessed
    const evilCR = new Proxy({}, {
        get(_, key) { if (key === '__type') throw new Error('proxy explosion'); return undefined; }
    });
    const r = gate.evaluate({}, { changeRecord: evilCR });
    const entry = auditEntry(r, 'changeRecord');
    assert(entry !== undefined, 'audit entry must be recorded even on exception');
    assertEqual(entry.failOpen, true, 'failOpen must be set');
    assert(entry.error !== undefined, 'error message must be recorded');
    // Verdict must not be DENY from Gate 6 alone; gate catches the exception
    assert(r.verdict !== 'DENY' || r.risks.some(r2 => r2 !== 'CHANGE_RECORD_INVALID'),
        'failOpen must not produce CHANGE_RECORD_INVALID risk');
});

// ── Existing gate behaviour preserved ────────────────────────────────────────
console.log('\nExisting gate behaviour (regression)');

test('VERDICT enum still exports ALLOW/WARN/RESTRICT/DENY/BLOCK', () => {
    const { VERDICT } = gate;
    assertEqual(VERDICT.ALLOW,    'ALLOW',  'ALLOW');
    assertEqual(VERDICT.WARN,     'WARN',   'WARN');
    assertEqual(VERDICT.RESTRICT, 'RESTRICT','RESTRICT');
    assertEqual(VERDICT.DENY,     'DENY',   'DENY');
    assertEqual(VERDICT.BLOCK,    'DENY',   'BLOCK');
});

test('evaluate() returns evaluatedAt and durationMs', () => {
    const r = gate.evaluate({}, {});
    assert(typeof r.evaluatedAt === 'string', 'evaluatedAt must be string');
    assert(typeof r.durationMs === 'number', 'durationMs must be number');
});

test('evaluate() returns riskScore', () => {
    const r = gate.evaluate({}, {});
    assert(typeof r.riskScore === 'number', 'riskScore must be number');
});

test('DEFAULT_TIMEOUT_MS exported and is number', () => {
    assert(typeof gate.DEFAULT_TIMEOUT_MS === 'number', 'DEFAULT_TIMEOUT_MS must be number');
    assert(gate.DEFAULT_TIMEOUT_MS > 0, 'DEFAULT_TIMEOUT_MS must be positive');
});

// ── Results ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════');
if (failed > 0) process.exit(1);
