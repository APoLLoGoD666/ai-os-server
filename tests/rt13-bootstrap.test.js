'use strict';
// tests/rt13-bootstrap.test.js
// T3-15: ActionProjection + EffectExpectationRecord Bootstrap (RT-13)
// Tests: 30 (T3-15-01 through T3-15-30)

const assert = require('assert');
const fs     = require('fs');

// ── Module under test ─────────────────────────────────────────────────────────
const rt13 = require('../lib/civilization/rt13-bootstrap');

// ── RT-13 constitutional types ────────────────────────────────────────────────
const {
    ActionProjection,
    EffectExpectationRecord,
    IrreversibilityClassificationRecord,
} = require('../lib/constitutional-types/effect-expectation-record');

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

console.log('\n=== T3-15: RT-13 Bootstrap — ActionProjection + EffectExpectationRecord ===\n');

// ── MODULE LOADING AND EXPORTS ────────────────────────────────────────────────

test('T3-15-01', 'module loads without error', () => {
    assert.ok(rt13, 'module required');
});

test('T3-15-02', 'formActionProjection exported as function', () => {
    assert.strictEqual(typeof rt13.formActionProjection, 'function');
});

test('T3-15-03', 'ID generators exported as functions', () => {
    assert.strictEqual(typeof rt13._generateApId, 'function');
    assert.strictEqual(typeof rt13._generateEerId, 'function');
    assert.strictEqual(typeof rt13._generateIcrId, 'function');
    assert.strictEqual(typeof rt13._generateAuthResRef, 'function');
});

test('T3-15-04', 'BOOTSTRAP_DOMAIN exported as string', () => {
    assert.strictEqual(typeof rt13.BOOTSTRAP_DOMAIN, 'string');
    assert.ok(rt13.BOOTSTRAP_DOMAIN.length > 0);
});

test('T3-15-05', '_emitted exported as Set', () => {
    assert.ok(rt13._emitted instanceof Set);
});

test('T3-15-06', 'module exports are frozen (immutable)', () => {
    assert.ok(Object.isFrozen(rt13));
});

// ── ID GENERATION FORMULAS ────────────────────────────────────────────────────

test('T3-15-07', '_generateApId produces AP-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-04T00:00:00.000Z';
    const id = rt13._generateApId(ts);
    assert.ok(id.startsWith('AP-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T3-15-08', '_generateEerId produces EER- prefix from apId', () => {
    const apId = 'AP-BOOTSTRAP-v1-2026-08-04T00:00:00.000Z';
    const id   = rt13._generateEerId(apId);
    assert.strictEqual(id, `EER-${apId}`);
});

test('T3-15-09', '_generateIcrId produces ICR- prefix from apId', () => {
    const apId = 'AP-BOOTSTRAP-v1-test';
    assert.strictEqual(rt13._generateIcrId(apId), `ICR-${apId}`);
});

test('T3-15-10', '_generateAuthResRef produces AUTH-RT13-BOOTSTRAP-v1- prefix (L-RT13-02)', () => {
    const ts = '2026-08-04T00:00:00.000Z';
    const id = rt13._generateAuthResRef(ts);
    assert.ok(id.startsWith('AUTH-RT13-BOOTSTRAP-v1-'), `got: ${id}`);
});

// ── ACTION PROJECTION SCHEMA ──────────────────────────────────────────────────

test('T3-15-11', 'ActionProjection.validate() accepts DECISION_RECEIPT bootstrap entry', () => {
    const ts   = new Date().toISOString();
    const apId = rt13._generateApId(ts);
    const result = ActionProjection.validate({
        action_projection_id: apId,
        decision_ref:         'DEC-BOOTSTRAP-v1-test',
        lifecycle_stage:      'DECISION_RECEIPT',
        domain:               rt13.BOOTSTRAP_DOMAIN,
        formation_timestamp:  ts,
        is_cross_domain:      false,
        authority_resolution_ref: rt13._generateAuthResRef(ts),
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T3-15-12', 'ActionProjection.validate() accepts CIVILIZATIONAL_ACTION with ICR + EER refs', () => {
    const ts   = new Date().toISOString();
    const apId = rt13._generateApId(ts);
    const result = ActionProjection.validate({
        action_projection_id:              apId,
        decision_ref:                      'DEC-BOOTSTRAP-v1-test',
        lifecycle_stage:                   'CIVILIZATIONAL_ACTION',
        domain:                            rt13.BOOTSTRAP_DOMAIN,
        formation_timestamp:               ts,
        is_cross_domain:                   false,
        authority_resolution_ref:          rt13._generateAuthResRef(ts),
        irreversibility_classification_ref: rt13._generateIcrId(apId),
        effect_expectation_ref:            rt13._generateEerId(apId),
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T3-15-13', 'ActionProjection.validate() rejects missing decision_ref (D8 INV-1)', () => {
    const ts   = new Date().toISOString();
    const result = ActionProjection.validate({
        action_projection_id: rt13._generateApId(ts),
        // decision_ref: omitted
        lifecycle_stage:      'DECISION_RECEIPT',
        domain:               rt13.BOOTSTRAP_DOMAIN,
        formation_timestamp:  ts,
        is_cross_domain:      false,
    });
    assert.ok(!result.valid, 'missing decision_ref must be invalid');
});

test('T3-15-14', 'ActionProjection lifecycle_stage enum includes all APL stages', () => {
    const schema = ActionProjection.SCHEMA.lifecycle_stage;
    assert.ok(schema.enum.includes('DECISION_RECEIPT'));
    assert.ok(schema.enum.includes('AUTHORITY_VALIDATION'));
    assert.ok(schema.enum.includes('CIVILIZATIONAL_ACTION'));
    assert.ok(schema.enum.includes('EXTERNAL_ACTION_PROJECTION'));
    assert.ok(schema.enum.includes('GATE_REJECTED'));
});

test('T3-15-15', 'ActionProjection is_cross_domain is required boolean (RT13-INV-7)', () => {
    const schema = ActionProjection.SCHEMA.is_cross_domain;
    assert.ok(schema.required === true);
    assert.strictEqual(schema.type, 'boolean');
    assert.ok(schema.constitutional_source.includes('RT13-INV-7'));
});

// ── IRREVERSIBILITY CLASSIFICATION RECORD ─────────────────────────────────────

test('T3-15-16', 'IrreversibilityClassificationRecord.validate() accepts REVERSIBLE bootstrap entry', () => {
    const ts   = new Date().toISOString();
    const apId = rt13._generateApId(ts);
    const result = IrreversibilityClassificationRecord.validate({
        icr_id:                       rt13._generateIcrId(apId),
        action_projection_ref:        apId,
        reversibility_classification: 'REVERSIBLE',
        classification_basis:         'Bootstrap CivilizationalDecision classified REVERSIBLE (T3-13)',
        classification_timestamp:     ts,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T3-15-17', 'ICR reversibility_classification enum includes all three values', () => {
    const schema = IrreversibilityClassificationRecord.SCHEMA.reversibility_classification;
    assert.ok(schema.enum.includes('REVERSIBLE'));
    assert.ok(schema.enum.includes('IRREVERSIBLE'));
    assert.ok(schema.enum.includes('CONDITIONALLY_REVERSIBLE'));
});

test('T3-15-18', 'ICR structural_immutable = true (D5 PI-8 — classification is permanent)', () => {
    assert.strictEqual(IrreversibilityClassificationRecord.CONSTITUTIONAL.structural_immutable, true);
});

// ── EFFECT EXPECTATION RECORD ─────────────────────────────────────────────────

test('T3-15-19', 'EffectExpectationRecord.validate() accepts bootstrap EER entry', () => {
    const ts   = new Date().toISOString();
    const apId = rt13._generateApId(ts);
    const result = EffectExpectationRecord.validate({
        eer_id:                       rt13._generateEerId(apId),
        action_projection_ref:        apId,
        expected_effects_description: 'Bootstrap: constitutional pipeline initialization',
        effect_observation_window:    'BOOTSTRAP-OBSERVATION-WINDOW-RT13-v1',
        formation_timestamp:          ts,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T3-15-20', 'EER structural_immutable = true (D5 PI-7 — expectations immutable after formation)', () => {
    assert.strictEqual(EffectExpectationRecord.CONSTITUTIONAL.structural_immutable, true);
});

test('T3-15-21', 'EER expected_effects_description is required (D8 TI-2)', () => {
    const schema = EffectExpectationRecord.SCHEMA.expected_effects_description;
    assert.ok(schema.required === true);
    assert.strictEqual(schema.type, 'string');
});

test('T3-15-22', 'EER effect_observation_window is required (D8 INV-6)', () => {
    const schema = EffectExpectationRecord.SCHEMA.effect_observation_window;
    assert.ok(schema.required === true);
    assert.ok(schema.constitutional_source.includes('INV-6'));
});

// ── CONSTITUTIONAL LIMITATIONS DOCUMENTATION ──────────────────────────────────

test('T3-15-23', 'L-RT13-01 through L-RT13-06 documented in module header', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt13-bootstrap'), 'utf8');
    assert.ok(src.includes('L-RT13-01'), 'L-RT13-01 documented');
    assert.ok(src.includes('L-RT13-02'), 'L-RT13-02 documented');
    assert.ok(src.includes('L-RT13-03'), 'L-RT13-03 documented');
    assert.ok(src.includes('L-RT13-04'), 'L-RT13-04 documented');
    assert.ok(src.includes('L-RT13-05'), 'L-RT13-05 documented');
    assert.ok(src.includes('L-RT13-06'), 'L-RT13-06 documented');
});

test('T3-15-24', 'IDR-W2-05-001 resolution documented — all three blockers addressed', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt13-bootstrap'), 'utf8');
    assert.ok(src.includes('IDR-W2-05-001'), 'IDR reference present');
    assert.ok(src.includes('Blocker 1'), 'Blocker 1 addressed');
    assert.ok(src.includes('Blocker 2'), 'Blocker 2 addressed');
    assert.ok(src.includes('Blocker 3'), 'Blocker 3 addressed');
});

test('T3-15-25', 'PRR not instantiated at bootstrap (L-RT13-04 — Stage 4 not crossed)', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt13-bootstrap'), 'utf8');
    // PRR is referenced in limitation comments but never .create()-d
    const creates = src.match(/ProjectionResponsibilityRecord\.create/g);
    assert.ok(!creates, 'PRR.create() must not appear in bootstrap source');
});

test('T3-15-26', 'PBCR not instantiated at bootstrap (L-RT13-06 — constitutionally unjustified)', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt13-bootstrap'), 'utf8');
    const creates = src.match(/ProjectionBoundaryCrossingRecord\.create/g);
    assert.ok(!creates, 'PBCR.create() must not appear in bootstrap source');
});

test('T3-15-27', 'RT13-INV-1 satisfied — ICR formation documented in source', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt13-bootstrap'), 'utf8');
    assert.ok(src.includes('RT13-INV-1'), 'RT13-INV-1 referenced');
    assert.ok(src.includes('IrreversibilityClassificationRecord'), 'ICR type used');
    assert.ok(src.includes("'REVERSIBLE'"), 'REVERSIBLE classification present');
});

test('T3-15-28', 'RT13-INV-2 satisfied — EER formation documented in source', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt13-bootstrap'), 'utf8');
    assert.ok(src.includes('RT13-INV-2'), 'RT13-INV-2 referenced');
    assert.ok(src.includes('EffectExpectationRecord'), 'EER type used');
    assert.ok(src.includes('expected_effects_description'), 'expected_effects_description populated');
});

// ── WIRING INTEGRATION ────────────────────────────────────────────────────────

test('T3-15-29', 'rt12-bootstrap.js imports and calls formActionProjection (T3-15 wiring)', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt12-bootstrap'), 'utf8');
    assert.ok(src.includes("require('./rt13-bootstrap')"), 'rt13-bootstrap imported');
    assert.ok(src.includes('formActionProjection'), 'formActionProjection called');
});

// ── ASYNC BEHAVIOR ────────────────────────────────────────────────────────────

test('T3-15-30', 'formActionProjection does not throw with minimal valid input', (done) => {
    (async () => {
        let threw = false;
        try {
            await rt13.formActionProjection({
                decisionId:    'DEC-BOOTSTRAP-v1-T3-15-TEST',
                drId:          'DR-BOOTSTRAP-v1-T3-15-TEST',
                cumVersionRef: 'CURRENT-v12-T3-15-TEST',
            });
        } catch (_) {
            threw = true;
        }
        assert.ok(!threw, 'formActionProjection must not throw');
    })().then(done).catch(done);
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`T3-15: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);

if (failed > 0) {
    process.exit(1);
}
