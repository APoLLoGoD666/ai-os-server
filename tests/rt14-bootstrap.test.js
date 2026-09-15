'use strict';
// tests/rt14-bootstrap.test.js
// T4-01: Reflection Runtime Bootstrap (RT-14)
// Tests: 20 (T4-01-01 through T4-01-20)
//
// Authority: A0-v1.1.1 §3.15; RT14-INV-1 through RT14-INV-6; RT12-INV-5;
//            D5-v1.0 PI-7 PI-12; D8-v1.0 INV-6 PROH-5 TI-2

const assert = require('assert');
const fs     = require('fs');

// ── Module under test ─────────────────────────────────────────────────────────
const rt14 = require('../lib/civilization/rt14-bootstrap');

// ── RT-14 constitutional types ────────────────────────────────────────────────
const {
    ObservedConsequenceRecord,
    CausalModelDivergenceRecord,
    OpenActionRegisterTerminalStatusRecord,
    ReflectionTriggerRecord,
} = require('../lib/constitutional-types/observed-consequence-record');

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

console.log('\n=== T4-01: RT-14 Bootstrap — Reflection Runtime ===\n');

// ── MODULE LOADING AND EXPORTS ────────────────────────────────────────────────

test('T4-01-01', 'module loads without error', () => {
    assert.ok(rt14, 'module required');
});

test('T4-01-02', 'reflect exported as async function', () => {
    assert.strictEqual(typeof rt14.reflect, 'function');
    const ret = rt14.reflect({ cor: { record_id: '__probe__', action_ref: 'x', expectation_ref: 'y', divergence_flag: false }, eer: { eer_id: 'y', expected_effects_description: 'probe' }, oarEntryId: 'z' });
    assert.ok(ret && typeof ret.then === 'function', 'reflect() returns a Promise');
    ret.catch(() => {});  // suppress unhandled rejection from probe call
    rt14._emitted.delete('__probe__');  // clean up probe entry
});

test('T4-01-03', 'all four ID generators exported as functions', () => {
    assert.strictEqual(typeof rt14._generateOcrId,    'function', '_generateOcrId');
    assert.strictEqual(typeof rt14._generateCmdrId,   'function', '_generateCmdrId');
    assert.strictEqual(typeof rt14._generateOarTsrId, 'function', '_generateOarTsrId');
    assert.strictEqual(typeof rt14._generateRtrId,    'function', '_generateRtrId');
});

test('T4-01-04', '_emitted exported as Set', () => {
    assert.ok(rt14._emitted instanceof Set);
});

test('T4-01-05', 'module exports are frozen (immutable)', () => {
    assert.ok(Object.isFrozen(rt14));
});

// ── ID GENERATION FORMULAS ────────────────────────────────────────────────────

test('T4-01-06', '_generateOcrId produces OCR-RT14-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt14._generateOcrId(ts);
    assert.ok(id.startsWith('OCR-RT14-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T4-01-07', '_generateCmdrId produces CMDR- prefix from ocrId', () => {
    const ocrId = 'OCR-RT14-BOOTSTRAP-v1-2026-08-20T00:00:00.000Z';
    assert.strictEqual(rt14._generateCmdrId(ocrId), `CMDR-${ocrId}`);
});

test('T4-01-08', '_generateOarTsrId produces OARTSR- prefix from oarEntryId and timestamp', () => {
    const oarEntryId = 'OAR-DEC-BOOTSTRAP-v1-test';
    const ts         = '2026-08-20T00:00:00.000Z';
    const id         = rt14._generateOarTsrId(oarEntryId, ts);
    assert.ok(id.startsWith('OARTSR-'), `got: ${id}`);
    assert.ok(id.includes(oarEntryId), 'oarEntryId embedded');
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T4-01-09', '_generateRtrId produces RTR- prefix from ocrId', () => {
    const ocrId = 'OCR-RT14-BOOTSTRAP-v1-test';
    assert.strictEqual(rt14._generateRtrId(ocrId), `RTR-${ocrId}`);
});

// ── OCR SCHEMA VALIDATION ─────────────────────────────────────────────────────

test('T4-01-10', 'ObservedConsequenceRecord.validate() accepts valid no-divergence entry (RT14-INV-1)', () => {
    const ts     = new Date().toISOString();
    const result = ObservedConsequenceRecord.validate({
        ocr_id:                      rt14._generateOcrId(ts),
        action_projection_ref:       'AP-BOOTSTRAP-v1-test',
        effect_expectation_ref:      'EER-AP-BOOTSTRAP-v1-test',
        consequence_observation_ref: 'COR-TEST-001',
        divergence_detected:         false,
        comparison_timestamp:        ts,
        deletion_prohibited:         true,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-01-11', 'ObservedConsequenceRecord.validate() accepts valid divergence entry (RT14-INV-2 trigger)', () => {
    const ts     = new Date().toISOString();
    const result = ObservedConsequenceRecord.validate({
        ocr_id:                      rt14._generateOcrId(ts),
        action_projection_ref:       'AP-BOOTSTRAP-v1-test',
        effect_expectation_ref:      'EER-AP-BOOTSTRAP-v1-test',
        consequence_observation_ref: 'COR-TEST-002',
        divergence_detected:         true,
        comparison_timestamp:        ts,
        deletion_prohibited:         true,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-01-12', 'OCR validate() REJECTS missing consequence_observation_ref (D8 TI-2 — mandatory)', () => {
    const ts     = new Date().toISOString();
    const result = ObservedConsequenceRecord.validate({
        ocr_id:                 rt14._generateOcrId(ts),
        action_projection_ref:  'AP-BOOTSTRAP-v1-test',
        effect_expectation_ref: 'EER-AP-BOOTSTRAP-v1-test',
        // consequence_observation_ref: omitted
        divergence_detected:    false,
        comparison_timestamp:   ts,
        deletion_prohibited:    true,
    });
    assert.ok(!result.valid, 'missing consequence_observation_ref must be invalid');
    assert.ok(result.errors.some(e => e.includes('consequence_observation_ref')));
});

test('T4-01-13', 'OCR validate() REJECTS divergence_detected of wrong type (string not boolean)', () => {
    const ts     = new Date().toISOString();
    const result = ObservedConsequenceRecord.validate({
        ocr_id:                      rt14._generateOcrId(ts),
        action_projection_ref:       'AP-BOOTSTRAP-v1-test',
        effect_expectation_ref:      'EER-test',
        consequence_observation_ref: 'COR-TEST-003',
        divergence_detected:         'false',  // wrong type — must be boolean
        comparison_timestamp:        ts,
        deletion_prohibited:         true,
    });
    assert.ok(!result.valid, 'string divergence_detected must be invalid');
});

// ── OAR-TSR SCHEMA VALIDATION ─────────────────────────────────────────────────

test('T4-01-14', 'OAR-TSR terminal_state enum enforces D5 PI-12 (COMPLETE/PARTIAL/FAILED/LOST only)', () => {
    const ts     = new Date().toISOString();
    const schema = OpenActionRegisterTerminalStatusRecord.SCHEMA.terminal_state;
    assert.ok(schema.enum.includes('COMPLETE'), 'COMPLETE required');
    assert.ok(schema.enum.includes('PARTIAL'),  'PARTIAL required');
    assert.ok(schema.enum.includes('FAILED'),   'FAILED required');
    assert.ok(schema.enum.includes('LOST'),     'LOST required');
    assert.strictEqual(schema.enum.length, 4, 'exactly 4 terminal states (D5 PI-12)');

    // Falsification: ABANDONED is not constitutionally valid
    const ocrId  = rt14._generateOcrId(ts);
    const result = OpenActionRegisterTerminalStatusRecord.validate({
        oar_tsr_id:                  rt14._generateOarTsrId('OAR-test', ts),
        oar_entry_ref:               'OAR-test',
        terminal_state:              'ABANDONED',  // not in enum — constitutional violation
        observed_consequence_ref:    ocrId,
        assignment_timestamp:        ts,
        issuing_runtime_attestation: true,
    });
    assert.ok(!result.valid, 'ABANDONED terminal_state must be invalid');
});

test('T4-01-15', 'OAR-TSR issuing_runtime_attestation is required boolean (RT12-INV-5 enforcement)', () => {
    const schema = OpenActionRegisterTerminalStatusRecord.SCHEMA.issuing_runtime_attestation;
    assert.ok(schema.required === true, 'issuing_runtime_attestation must be required');
    assert.strictEqual(schema.type, 'boolean', 'must be boolean type');
    assert.ok(schema.constitutional_source.includes('RT12-INV-5'), 'RT12-INV-5 cited');
});

// ── RTR SCHEMA VALIDATION ─────────────────────────────────────────────────────

test('T4-01-16', 'RTR rt09_triggered and rt11_triggered are required booleans (RT14-INV-5)', () => {
    const s09 = ReflectionTriggerRecord.SCHEMA.rt09_triggered;
    const s11 = ReflectionTriggerRecord.SCHEMA.rt11_triggered;
    assert.ok(s09.required === true,       'rt09_triggered required');
    assert.strictEqual(s09.type, 'boolean', 'rt09_triggered boolean');
    assert.ok(s09.constitutional_source.includes('RT14-INV-5'), 'RT14-INV-5 cited in rt09');
    assert.ok(s11.required === true,       'rt11_triggered required');
    assert.strictEqual(s11.type, 'boolean', 'rt11_triggered boolean');
    assert.ok(s11.constitutional_source.includes('RT14-INV-5'), 'RT14-INV-5 cited in rt11');
});

test('T4-01-17', 'RTR causal_model_divergence_ref is optional (present only when divergence detected)', () => {
    const schema = ReflectionTriggerRecord.SCHEMA.causal_model_divergence_ref;
    assert.ok(schema.required !== true, 'causal_model_divergence_ref must be optional');

    // Falsification: RTR without divergence ref must still be valid (RT14-INV-5: unconditional)
    const ts     = new Date().toISOString();
    const ocrId  = rt14._generateOcrId(ts);
    const result = ReflectionTriggerRecord.validate({
        rtr_id:                   rt14._generateRtrId(ocrId),
        observed_consequence_ref:  ocrId,
        rt09_triggered:           true,
        rt11_triggered:           true,
        trigger_timestamp:        ts,
        // causal_model_divergence_ref: absent — no divergence case
    });
    assert.ok(result.valid, `RTR without CMDR ref must be valid: ${JSON.stringify(result.errors)}`);
});

// ── CMDR SCHEMA VALIDATION ────────────────────────────────────────────────────

test('T4-01-18', 'CMDR structural_immutable=true and divergence_magnitude accepts bootstrap value', () => {
    assert.strictEqual(CausalModelDivergenceRecord.CONSTITUTIONAL.structural_immutable, true,
        'CMDR must be structurally immutable (D8 PROH-5)');

    // Verify MODERATE is a valid magnitude (L-RT14-06 bootstrap default)
    const ts     = new Date().toISOString();
    const ocrId  = rt14._generateOcrId(ts);
    const result = CausalModelDivergenceRecord.validate({
        cmdr_id:                  rt14._generateCmdrId(ocrId),
        action_projection_ref:    'AP-BOOTSTRAP-v1-test',
        observed_consequence_ref: ocrId,
        divergence_description:   'Bootstrap divergence test — L-RT14-06 MODERATE default',
        divergence_magnitude:     'MODERATE',  // L-RT14-06 bootstrap default
        affected_domain:          'APEX-AI-OS-BOOTSTRAP',
        registration_timestamp:   ts,
    });
    assert.ok(result.valid, `CMDR with MODERATE magnitude must be valid: ${JSON.stringify(result.errors)}`);
});

// ── CONSTITUTIONAL LIMITATIONS DOCUMENTATION ──────────────────────────────────

test('T4-01-19', 'L-RT14-01 through L-RT14-06 and RT14-INV-1 through RT14-INV-5 documented in source', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt14-bootstrap'), 'utf8');
    // Constitutional limitations
    assert.ok(src.includes('L-RT14-01'), 'L-RT14-01 documented');
    assert.ok(src.includes('L-RT14-02'), 'L-RT14-02 documented');
    assert.ok(src.includes('L-RT14-03'), 'L-RT14-03 documented');
    assert.ok(src.includes('L-RT14-04'), 'L-RT14-04 documented');
    assert.ok(src.includes('L-RT14-05'), 'L-RT14-05 documented');
    assert.ok(src.includes('L-RT14-06'), 'L-RT14-06 documented');
    // Core invariants
    assert.ok(src.includes('RT14-INV-1'), 'RT14-INV-1 referenced');
    assert.ok(src.includes('RT14-INV-2'), 'RT14-INV-2 referenced');
    assert.ok(src.includes('RT14-INV-3'), 'RT14-INV-3 referenced');
    assert.ok(src.includes('RT14-INV-4'), 'RT14-INV-4 referenced');
    assert.ok(src.includes('RT14-INV-5'), 'RT14-INV-5 referenced');
    assert.ok(src.includes('RT12-INV-5'), 'RT12-INV-5 referenced (OAR-TSR authority boundary)');
    // Sequence enforcement
    assert.ok(src.includes('divergenceDetected ? \'PARTIAL\' : \'COMPLETE\''),
        'L-RT14-05 terminal_state bootstrap logic present');
    assert.ok(src.includes("'MODERATE'"), 'L-RT14-06 MODERATE default present');
});

// ── ASYNC BEHAVIOR ────────────────────────────────────────────────────────────

test('T4-01-20', 'reflect() does not throw with minimal valid COR/EER input', (done) => {
    (async () => {
        const ts  = new Date().toISOString();
        const corId = `COR-T4-01-20-${ts}`;
        let threw = false;
        let result;
        try {
            result = await rt14.reflect({
                cor: {
                    record_id:        corId,
                    action_ref:       'AP-BOOTSTRAP-v1-T4-01-20',
                    expectation_ref:  'EER-AP-BOOTSTRAP-v1-T4-01-20',
                    divergence_flag:  false,
                    domain_attribution: 'APEX-AI-OS-BOOTSTRAP',
                },
                eer: {
                    eer_id:                       'EER-AP-BOOTSTRAP-v1-T4-01-20',
                    expected_effects_description: 'T4-01 bootstrap test — no divergence case',
                },
                oarEntryId: 'OAR-DEC-BOOTSTRAP-v1-T4-01-20',
            });
        } catch (_) {
            threw = true;
        }
        assert.ok(!threw, 'reflect() must not throw');
        // If constitutional-store is unavailable, result may be null — both null and
        // object return are valid (fire-and-forget write pattern; L-RT14-04).
        // The invariant is no-throw, not guaranteed DB success.
        assert.ok(result === null || (result && typeof result.ocrId === 'string'),
            'result must be null or an object with ocrId');
    })().then(done).catch(done);
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`T4-01: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);

if (failed > 0) {
    process.exit(1);
}
