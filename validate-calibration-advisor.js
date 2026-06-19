'use strict';
// validate-calibration-advisor.js — lattice-calibration-advisor tests

const advisor = require('./lib/runtime/lattice-calibration-advisor');
const dl      = require('./lib/runtime/decision-lattice');
const hs      = require('./lib/runtime/lattice-health-signal');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? ': ' + detail : ''}`); }
}
function isStr(v)  { return typeof v === 'string'; }
function isNum(v)  { return typeof v === 'number' && isFinite(v); }
function isArr(v)  { return Array.isArray(v); }

// Build a health snapshot directly — no DB/LLM needed
function snap(opts = {}) {
    return Object.freeze({
        windowSize:                  1000,
        sampleSize:                  opts.sampleSize  ?? 500,
        fmStabilityScore:            opts.fm          ?? 0.85,
        dtStabilityScore:            opts.dt          ?? 0.80,
        systemDriftIndex:            opts.drift       ?? 0.20,
        constitutionalPressureIndex: opts.pressure    ?? 0.05,
        computedAt:                  new Date().toISOString(),
    });
}

function main() {

    // ── Section 1: Module exports ─────────────────────────────────────────────
    {
        assert('1.01 getCalibrationAdvice is function', typeof advisor.getCalibrationAdvice === 'function');
        assert('1.02 THRESHOLD is object',              typeof advisor.THRESHOLD             === 'object');
        assert('1.03 THRESHOLD.FM_MIN = 0.70',         advisor.THRESHOLD.FM_MIN   === 0.70);
        assert('1.04 THRESHOLD.DT_MIN = 0.65',         advisor.THRESHOLD.DT_MIN   === 0.65);
        assert('1.05 THRESHOLD.DRIFT_MAX = 0.30',      advisor.THRESHOLD.DRIFT_MAX  === 0.30);
        assert('1.06 THRESHOLD.PRESSURE_MAX = 0.10',   advisor.THRESHOLD.PRESSURE_MAX === 0.10);
        assert('1.07 THRESHOLD is frozen',             Object.isFrozen(advisor.THRESHOLD));
    }

    // ── Section 2: empty window → NONE with confidence 0 ─────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap({ sampleSize: 0, fm: null, dt: null, drift: null, pressure: null }));
        assert('2.01 NONE on empty',          a.recommendationLevel === 'NONE');
        assert('2.02 confidence = 0',         a.confidence === 0);
        assert('2.03 no proposed actions',    a.proposedActions.length === 0);
        assert('2.04 result is frozen',       Object.isFrozen(a));
        assert('2.05 generatedAt is string',  isStr(a.generatedAt));
        assert('2.06 rationale is string',    isStr(a.rationale));
        assert('2.07 fmObservation string',   isStr(a.fmObservation));
        assert('2.08 dtObservation string',   isStr(a.dtObservation));
    }

    // ── Section 3: all metrics healthy → NONE ────────────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.90, dt: 0.85, drift: 0.15, pressure: 0.02 }));
        assert('3.01 NONE when all healthy',    a.recommendationLevel === 'NONE');
        assert('3.02 no proposals',             a.proposedActions.length === 0);
        assert('3.03 confidence >= 0.80',       a.confidence >= 0.80);
        assert('3.04 rationale mentions bounds', a.rationale.includes('normal bounds'));
    }

    // ── Section 4: fm < 0.70 → WATCH with FM proposal ─────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.65, dt: 0.75, drift: 0.25, pressure: 0.05 }));
        assert('4.01 WATCH level',               a.recommendationLevel === 'WATCH');
        assert('4.02 FM proposal present',       a.proposedActions.includes('Review Founder Model scoring inputs'));
        assert('4.03 exactly 1 proposal',        a.proposedActions.length === 1);
        assert('4.04 fmObservation mentions FM', a.fmObservation.includes('fmStabilityScore'));
        assert('4.05 rationale mentions FM',     a.rationale.includes('FM stability'));
    }

    // ── Section 5: dt < 0.65 → WATCH with DT proposal ─────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.80, dt: 0.60, drift: 0.40, pressure: 0.05 }));
        // drift also fires (0.40 > 0.30) → severity = 1 (dt) + 2 (drift) = 3 → INVESTIGATE
        // Let's test DT-only:
        const a2 = advisor.getCalibrationAdvice(snap({ fm: 0.80, dt: 0.60, drift: 0.25, pressure: 0.05 }));
        assert('5.01 WATCH on DT-only breach',     a2.recommendationLevel === 'WATCH');
        assert('5.02 DT proposal present',         a2.proposedActions.includes('Review Digital Twin prediction assumptions'));
        assert('5.03 dtObservation mentions DT',   a2.dtObservation.includes('dtStabilityScore'));
    }

    // ── Section 6: driftIndex > 0.30 → REVIEW ────────────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.80, dt: 0.70, drift: 0.35, pressure: 0.05 }));
        assert('6.01 REVIEW on drift',              a.recommendationLevel === 'REVIEW');
        assert('6.02 drift proposal present',       a.proposedActions.includes('Investigate FM/DT divergence'));
        assert('6.03 rationale mentions drift',     a.rationale.includes('drift index'));
    }

    // ── Section 7: pressure > 0.10 → REVIEW ──────────────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.80, dt: 0.70, drift: 0.20, pressure: 0.15 }));
        assert('7.01 REVIEW on pressure',           a.recommendationLevel === 'REVIEW');
        assert('7.02 pressure proposal present',    a.proposedActions.includes('Review Constitution threshold tuning'));
        assert('7.03 rationale mentions pressure',  a.rationale.includes('Constitutional pressure'));
    }

    // ── Section 8: multiple signals → INVESTIGATE ─────────────────────────────
    {
        // drift(+2) + pressure(+2) = 4 → INVESTIGATE
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.80, dt: 0.70, drift: 0.35, pressure: 0.15 }));
        assert('8.01 INVESTIGATE on multiple',      a.recommendationLevel === 'INVESTIGATE');
        assert('8.02 two proposals',                a.proposedActions.length === 2);

        // fm(+1) + dt(+1) + drift(+2) = 4 → INVESTIGATE
        const a2 = advisor.getCalibrationAdvice(snap({ fm: 0.60, dt: 0.60, drift: 0.35, pressure: 0.05 }));
        assert('8.03 3-signal → INVESTIGATE',       a2.recommendationLevel === 'INVESTIGATE');
        assert('8.04 3 proposals',                  a2.proposedActions.length === 3);
    }

    // ── Section 9: severity → level mapping ──────────────────────────────────
    {
        // severity 0 → NONE
        assert('9.01 severity 0 = NONE',       advisor.getCalibrationAdvice(snap({ fm: 0.90, dt: 0.80, drift: 0.10, pressure: 0.02 })).recommendationLevel === 'NONE');
        // severity 1 → WATCH  (fm breach only)
        assert('9.02 severity 1 = WATCH',      advisor.getCalibrationAdvice(snap({ fm: 0.65, dt: 0.80, drift: 0.10, pressure: 0.02 })).recommendationLevel === 'WATCH');
        // severity 2 → REVIEW (drift breach)
        assert('9.03 severity 2 = REVIEW',     advisor.getCalibrationAdvice(snap({ fm: 0.80, dt: 0.80, drift: 0.35, pressure: 0.02 })).recommendationLevel === 'REVIEW');
        // severity 3 → INVESTIGATE (fm + drift)
        assert('9.04 severity 3 = INVESTIGATE',advisor.getCalibrationAdvice(snap({ fm: 0.65, dt: 0.80, drift: 0.35, pressure: 0.02 })).recommendationLevel === 'INVESTIGATE');
    }

    // ── Section 10: confidence tiers ─────────────────────────────────────────
    {
        assert('10.01 n<50  → conf 0.30',   advisor.getCalibrationAdvice(snap({ sampleSize: 20  })).confidence === 0.30);
        assert('10.02 n<200 → conf 0.60',   advisor.getCalibrationAdvice(snap({ sampleSize: 100 })).confidence === 0.60);
        assert('10.03 n<500 → conf 0.80',   advisor.getCalibrationAdvice(snap({ sampleSize: 300 })).confidence === 0.80);
        assert('10.04 n>=500 → conf 0.95',  advisor.getCalibrationAdvice(snap({ sampleSize: 600 })).confidence === 0.95);
        assert('10.05 n=0   → conf 0',      advisor.getCalibrationAdvice(snap({ sampleSize: 0   })).confidence === 0);
    }

    // ── Section 11: result is fully frozen ───────────────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap());
        assert('11.01 result is frozen',         Object.isFrozen(a));
        assert('11.02 proposedActions is frozen', Object.isFrozen(a.proposedActions));

        let threw = false;
        try { a.recommendationLevel = 'INVESTIGATE'; } catch (_) { threw = true; }
        assert('11.03 mutation throws',          threw);

        let threw2 = false;
        try { a.proposedActions.push('sneaky'); } catch (_) { threw2 = true; }
        assert('11.04 array mutation throws',    threw2);
    }

    // ── Section 12: determinism — same input → same output ───────────────────
    {
        const s = snap({ fm: 0.60, dt: 0.60, drift: 0.40, pressure: 0.12 });
        const a1 = advisor.getCalibrationAdvice(s);
        const a2 = advisor.getCalibrationAdvice(s);
        assert('12.01 same level',            a1.recommendationLevel === a2.recommendationLevel);
        assert('12.02 same proposal count',   a1.proposedActions.length === a2.proposedActions.length);
        assert('12.03 same proposals',        JSON.stringify(a1.proposedActions) === JSON.stringify(a2.proposedActions));
        assert('12.04 same confidence',       a1.confidence === a2.confidence);
        assert('12.05 same rationale',        a1.rationale === a2.rationale);
        // generatedAt differs per call — intentional (audit timestamp)
    }

    // ── Section 13: proposedActions is a plain frozen array of strings ────────
    {
        const a = advisor.getCalibrationAdvice(snap({ fm: 0.60, dt: 0.60, drift: 0.35, pressure: 0.05 }));
        assert('13.01 proposedActions is array',          isArr(a.proposedActions));
        assert('13.02 all actions are strings',           a.proposedActions.every(isStr));
        assert('13.03 actions include known proposals',   a.proposedActions.some(p => p.startsWith('Review') || p.startsWith('Investigate')));
    }

    // ── Section 14: no mutations to runtime state ─────────────────────────────
    {
        // Record lattice constants before
        const wfmBefore    = dl.W_FM;
        const wdtBefore    = dl.W_DT;
        const tAllowBefore = dl.T_ALLOW;

        // Run advisor with worst-case inputs
        advisor.getCalibrationAdvice(snap({ fm: 0.10, dt: 0.10, drift: 0.90, pressure: 0.90 }));

        assert('14.01 W_FM unchanged after advice',    dl.W_FM    === wfmBefore);
        assert('14.02 W_DT unchanged after advice',    dl.W_DT    === wdtBefore);
        assert('14.03 T_ALLOW unchanged after advice', dl.T_ALLOW  === tAllowBefore);

        // Health signal window size unchanged
        assert('14.04 WINDOW_SIZE unchanged',          hs.WINDOW_SIZE === 1000);
    }

    // ── Section 15: output shape completeness ────────────────────────────────
    {
        const a = advisor.getCalibrationAdvice(snap());
        const keys = ['generatedAt', 'recommendationLevel', 'fmObservation', 'dtObservation', 'rationale', 'proposedActions', 'confidence'];
        for (const k of keys) {
            assert(`15.x key present: ${k}`, k in a);
        }
        assert('15.08 no extra keys', Object.keys(a).length === keys.length);
    }

    // ── Results ───────────────────────────────────────────────────────────────
    console.log(`\nPassed: ${passed} / ${passed + failed}`);
    if (failures.length) {
        failures.forEach(f => console.log(f));
        process.exit(1);
    } else {
        console.log('All tests passed.');
    }
}

main();
