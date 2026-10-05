'use strict';
// tests/rt11-bootstrap.test.js
// T4-02: CausalModel + AssumptionRegister Bootstrap (RT-11)
// Tests: 20 (T4-02-01 through T4-02-20)
//
// Authority: A0-v1.1.1 §3.12 R8; R11-v1.3-canonical.md RS-07;
//            D-7-v1.0 Part 8 (TOC-3 TOC-4 TOC-5); WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8

const assert = require('assert');
const fs     = require('fs');

// ── Modules under test ────────────────────────────────────────────────────────
const rt11 = require('../lib/civilization/rt11-bootstrap');
const deliberation = require('../lib/civilization/deliberation-registry');

// ── RT-11 constitutional types ────────────────────────────────────────────────
const {
    CausalModel,
    AssumptionRegister,
} = require('../lib/constitutional-types/civilizational-decision-proposal');

let passed = 0;
let failed = 0;

function test(id, desc, fn) {
    try {
        fn();
        console.log(`  PASS  ${id}: ${desc}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL  ${id}: ${desc} — ${e.message}`);
        failed++;
    }
}

console.log('\n=== T4-02: RT-11 Bootstrap — CausalModel + AssumptionRegister ===\n');

// ── MODULE LOADING AND EXPORTS ────────────────────────────────────────────────

test('T4-02-01', 'rt11-bootstrap module loads without error', () => {
    assert.ok(rt11, 'module required');
});

test('T4-02-02', 'formCausalModel exported as async function', () => {
    assert.strictEqual(typeof rt11.formCausalModel, 'function');
});

test('T4-02-03', 'ID generators and BOOTSTRAP_ASSUMPTIONS exported', () => {
    assert.strictEqual(typeof rt11._generateArId,         'function', '_generateArId');
    assert.strictEqual(typeof rt11._generateCmId,         'function', '_generateCmId');
    assert.ok(Array.isArray(rt11.BOOTSTRAP_ASSUMPTIONS),              'BOOTSTRAP_ASSUMPTIONS is array');
    assert.ok(rt11._emitted instanceof Set,                           '_emitted is Set');
});

test('T4-02-04', 'module exports are frozen (immutable)', () => {
    assert.ok(Object.isFrozen(rt11));
});

// ── ID GENERATION FORMULAS ────────────────────────────────────────────────────

test('T4-02-05', '_generateArId produces AR-RT11-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt11._generateArId(ts);
    assert.ok(id.startsWith('AR-RT11-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T4-02-06', '_generateCmId produces CM-RT11-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt11._generateCmId(ts);
    assert.ok(id.startsWith('CM-RT11-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

// ── CAUSAL MODEL SCHEMA VALIDATION ───────────────────────────────────────────

test('T4-02-07', 'CausalModel.validate() accepts valid bootstrap entry (REGISTERED lifecycle)', () => {
    const ts   = new Date().toISOString();
    const arId = rt11._generateArId(ts);
    const cmId = rt11._generateCmId(ts);
    const result = CausalModel.validate({
        cm_id:                    cmId,
        causal_chain_description: 'Bootstrap causal chain — T4-02 test',
        assumption_register_ref:  arId,
        scope_classification:     'civilizational',  // RS-35 PROH-R8
        registration_timestamp:   ts,
        lifecycle_state:          'REGISTERED',
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-02-08', 'CausalModel.validate() REJECTS invalid lifecycle_state (D7 TOC-4 guard)', () => {
    const ts     = new Date().toISOString();
    const result = CausalModel.validate({
        cm_id:                    rt11._generateCmId(ts),
        causal_chain_description: 'Test',
        assumption_register_ref:  rt11._generateArId(ts),
        scope_classification:     'civilizational',
        registration_timestamp:   ts,
        lifecycle_state:          'ACTIVE',  // not in enum: REGISTERED/CURRENT/SUPERSEDED/REVISED
    });
    assert.ok(!result.valid, 'ACTIVE lifecycle_state is not valid for CausalModel');
});

test('T4-02-09', 'CausalModel.validate() REJECTS missing causal_chain_description (D2 §VII)', () => {
    const ts     = new Date().toISOString();
    const result = CausalModel.validate({
        cm_id:                   rt11._generateCmId(ts),
        // causal_chain_description: omitted
        assumption_register_ref: rt11._generateArId(ts),
        scope_classification:    'civilizational',
        registration_timestamp:  ts,
        lifecycle_state:         'REGISTERED',
    });
    assert.ok(!result.valid, 'missing causal_chain_description must be invalid');
    assert.ok(result.errors.some(e => e.includes('causal_chain_description')));
});

test('T4-02-10', 'CausalModel.CONSTITUTIONAL.structural_immutable is false (TOC-4/5 revisions allowed)', () => {
    assert.strictEqual(CausalModel.CONSTITUTIONAL.structural_immutable, false,
        'CausalModel must be mutable — revised by TOC-4 and TOC-5');
});

// ── ASSUMPTION REGISTER SCHEMA VALIDATION ────────────────────────────────────

test('T4-02-11', 'AssumptionRegister.validate() accepts valid bootstrap entry', () => {
    const ts   = new Date().toISOString();
    const arId = rt11._generateArId(ts);
    const cmId = rt11._generateCmId(ts);
    const result = AssumptionRegister.validate({
        ar_id:                  arId,
        causal_model_ref:       cmId,
        assumptions:            [{ assumption_id: 'BOOT-ASM-01', description: 'Test' }],
        registration_timestamp: ts,
        lifecycle_state:        'ACTIVE',
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-02-12', 'AssumptionRegister.validate() REJECTS missing assumptions array (D7 TOC-4 guard)', () => {
    const ts     = new Date().toISOString();
    const result = AssumptionRegister.validate({
        ar_id:                  rt11._generateArId(ts),
        causal_model_ref:       rt11._generateCmId(ts),
        // assumptions: omitted
        registration_timestamp: ts,
        lifecycle_state:        'ACTIVE',
    });
    assert.ok(!result.valid, 'missing assumptions array must be invalid');
});

test('T4-02-13', 'AssumptionRegister lifecycle_state enum: ACTIVE/REVISED/ARCHIVED only', () => {
    const schema = AssumptionRegister.SCHEMA.lifecycle_state;
    assert.ok(schema.enum.includes('ACTIVE'),   'ACTIVE required');
    assert.ok(schema.enum.includes('REVISED'),  'REVISED required');
    assert.ok(schema.enum.includes('ARCHIVED'), 'ARCHIVED required');
    assert.strictEqual(schema.enum.length, 3,   'exactly 3 lifecycle states');
});

// ── BOOTSTRAP ASSUMPTIONS ─────────────────────────────────────────────────────

test('T4-02-14', 'BOOTSTRAP_ASSUMPTIONS contains at least 3 entries (BOOT-ASM-01 through BOOT-ASM-03)', () => {
    assert.ok(rt11.BOOTSTRAP_ASSUMPTIONS.length >= 3,
        `BOOTSTRAP_ASSUMPTIONS must have at least 3 entries; got ${rt11.BOOTSTRAP_ASSUMPTIONS.length}`);
    const ids = rt11.BOOTSTRAP_ASSUMPTIONS.map(a => a.assumption_id);
    assert.ok(ids.includes('BOOT-ASM-01'), 'BOOT-ASM-01 required');
    assert.ok(ids.includes('BOOT-ASM-02'), 'BOOT-ASM-02 required');
    assert.ok(ids.includes('BOOT-ASM-03'), 'BOOT-ASM-03 required');
});

test('T4-02-15', 'BOOT-ASM-03 references Stage 4 crossing as revision trigger (T3-15 dependency)', () => {
    const asm03 = rt11.BOOTSTRAP_ASSUMPTIONS.find(a => a.assumption_id === 'BOOT-ASM-03');
    assert.ok(asm03, 'BOOT-ASM-03 must exist');
    assert.ok(asm03.revision_trigger.includes('Stage 4') || asm03.revision_trigger.includes('stage 4') ||
              asm03.description.includes('Stage 4'),
        'BOOT-ASM-03 must reference Stage 4 crossing as a known dependency');
});

// ── CONSTITUTIONAL LIMITATIONS DOCUMENTATION ──────────────────────────────────

test('T4-02-16', 'L-RT11-01 through L-RT11-05 documented in rt11-bootstrap.js source', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt11-bootstrap'), 'utf8');
    assert.ok(src.includes('L-RT11-01'), 'L-RT11-01 documented');
    assert.ok(src.includes('L-RT11-02'), 'L-RT11-02 documented');
    assert.ok(src.includes('L-RT11-03'), 'L-RT11-03 documented');
    assert.ok(src.includes('L-RT11-04'), 'L-RT11-04 documented');
    assert.ok(src.includes('L-RT11-05'), 'L-RT11-05 documented');
    assert.ok(src.includes("'civilizational'"), 'RS-35 PROH-R8 scope_classification enforced');
    assert.ok(src.includes("'REGISTERED'"),     'lifecycle_state=REGISTERED at bootstrap');
});

// ── WIRING INTEGRATION ────────────────────────────────────────────────────────

test('T4-02-17', 'deliberation-registry.js imports and calls formCausalModel (T4-02 wiring)', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/deliberation-registry'), 'utf8');
    assert.ok(src.includes("require('./rt11-bootstrap')"), 'rt11-bootstrap imported');
    assert.ok(src.includes('formCausalModel'),             'formCausalModel called');
    assert.ok(src.includes('_buildDrParticipants(cmId'),   '_buildDrParticipants receives cmId');
});

test('T4-02-18', '_buildDrParticipants(cmId) returns ACTIVE Theory of Change when cmId provided', () => {
    const participants = deliberation._buildDrParticipants('CM-TEST-123');
    const toc = participants.find(p => p.role === 'Theory of Change');
    assert.ok(toc,                               'Theory of Change participant exists');
    assert.strictEqual(toc.status, 'ACTIVE',     'status=ACTIVE when cmId provided');
    assert.ok(toc.note.includes('CM-TEST-123'),  'note references cmId');
});

test('T4-02-19', '_buildDrParticipants() without cmId preserves BOOTSTRAP fallback (backward-compat)', () => {
    const participants = deliberation._buildDrParticipants();
    const toc = participants.find(p => p.role === 'Theory of Change');
    assert.ok(toc,                                  'Theory of Change participant exists');
    assert.strictEqual(toc.status, 'BOOTSTRAP',     'status=BOOTSTRAP when no cmId (fallback)');
});

// ── ASYNC BEHAVIOR ────────────────────────────────────────────────────────────

test('T4-02-20', 'formCausalModel() does not throw with minimal valid input', (done) => {
    (async () => {
        const ts  = new Date().toISOString();
        const drId = `DR-T4-02-20-${ts}`;
        let threw = false;
        let result;
        try {
            result = await rt11.formCausalModel({
                drId,
                cumVersionRef: 'CURRENT-v12-T4-02-TEST',
            });
        } catch (_) {
            threw = true;
        }
        assert.ok(!threw, 'formCausalModel() must not throw');
        // constitutional-store.write() is fire-and-forget; result may be { cmId, arId } or null
        assert.ok(result === null || (result && typeof result.cmId === 'string'),
            'result must be null or object with cmId');
    })().then(done).catch(done);
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`T4-02: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);

if (failed > 0) {
    process.exit(1);
}
