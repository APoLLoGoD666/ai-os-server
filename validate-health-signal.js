'use strict';
// validate-health-signal.js — lattice-health-signal unit tests

const hs     = require('./lib/runtime/lattice-health-signal');
const et     = require('./lib/runtime/execution-transaction');
const csm    = require('./lib/runtime/concurrency-slot-manager');
const clog   = require('./lib/runtime/compensation-log');
const fb     = require('./lib/runtime/lattice-feedback-loop');
const lattice = require('./lib/runtime/decision-lattice');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? ': ' + detail : ''}`); }
}
function isNum(v)  { return typeof v === 'number' && isFinite(v); }
function isStr(v)  { return typeof v === 'string'; }
function isNull(v) { return v === null; }

function mockReq(overrides = {}) {
    return { method: 'GET', path: '/api/test', url: '/api/test', headers: {}, user: null, body: null, ...overrides };
}

// Craft a minimal tx stub with latticeDecision already set — no I/O needed.
function mockTxWithLattice(opts = {}) {
    return {
        txId:    opts.txId    || 'TX-MOCK-00001',
        result:  opts.result  ?? { statusCode: 200 },
        latticeDecision: {
            founderAlignmentScore: opts.fm      ?? 0.70,
            digitalTwinPrediction: opts.dt      ?? 0.50,
            finalDecisionScore:    opts.score   ?? 0.60,
            constitutionVerdict:   opts.verdict ?? 'ALLOW',
        },
        invariantReport: {
            criticalFailed: opts.criticalFailed ?? 0,
        },
        compensations: [],
    };
}

async function main() {

    // ── Section 1: Module exports ─────────────────────────────────────────────
    {
        assert('1.01 record is function',          typeof hs.record          === 'function');
        assert('1.02 getHealthSnapshot is fn',     typeof hs.getHealthSnapshot === 'function');
        assert('1.03 reset is function',           typeof hs.reset           === 'function');
        assert('1.04 _reset alias exists',         typeof hs._reset          === 'function');
        assert('1.05 WINDOW_SIZE = 1000',          hs.WINDOW_SIZE            === 1000);
    }

    // ── Section 2: empty window snapshot ─────────────────────────────────────
    {
        hs._reset();
        const snap = hs.getHealthSnapshot();
        assert('2.01 windowSize = 1000',          snap.windowSize === 1000);
        assert('2.02 sampleSize = 0',             snap.sampleSize === 0);
        assert('2.03 fmStabilityScore = null',    isNull(snap.fmStabilityScore));
        assert('2.04 dtStabilityScore = null',    isNull(snap.dtStabilityScore));
        assert('2.05 systemDriftIndex = null',    isNull(snap.systemDriftIndex));
        assert('2.06 pressureIndex = null',       isNull(snap.constitutionalPressureIndex));
        assert('2.07 computedAt is string',       isStr(snap.computedAt));
        assert('2.08 snapshot is frozen',         Object.isFrozen(snap));
    }

    // ── Section 3: record() skips no-lattice tx ───────────────────────────────
    {
        hs._reset(); et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        et.finalize(tx.txId, { statusCode: 200 });  // latticeDecision = null

        const snap = hs.getHealthSnapshot();
        assert('3.01 no-lattice tx not recorded', snap.sampleSize === 0);

        hs._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 4: record() processes lattice tx ──────────────────────────────
    {
        hs._reset();

        hs.record(mockTxWithLattice({ fm: 0.70, dt: 0.50, score: 0.60, statusCode: 200 }));

        const snap = hs.getHealthSnapshot();
        assert('4.01 sampleSize = 1',          snap.sampleSize === 1);
        assert('4.02 snapshot is frozen',      Object.isFrozen(snap));
        assert('4.03 computedAt is string',    isStr(snap.computedAt));
        assert('4.04 fmStabilityScore ∈ [0,1]', snap.fmStabilityScore >= 0 && snap.fmStabilityScore <= 1);
        assert('4.05 dtStabilityScore ∈ [0,1]', snap.dtStabilityScore >= 0 && snap.dtStabilityScore <= 1);
        assert('4.06 systemDriftIndex ∈ [0,1]', snap.systemDriftIndex >= 0 && snap.systemDriftIndex <= 1);
        assert('4.07 pressureIndex ∈ [0,1]',    snap.constitutionalPressureIndex >= 0 && snap.constitutionalPressureIndex <= 1);

        hs._reset();
    }

    // ── Section 5: fmStabilityScore = 1 - avg(decisionError) ─────────────────
    {
        hs._reset();
        // score=0.80, success=true → actualStability=1.0 → decisionError=|0.80-1.0|=0.20
        // fmStabilityScore = 1 - 0.20 = 0.80
        hs.record(mockTxWithLattice({ fm: 0.80, dt: 0.60, score: 0.80, result: { statusCode: 200 } }));
        const snap = hs.getHealthSnapshot();
        assert('5.01 fmStabilityScore = 0.8000', Math.abs(snap.fmStabilityScore - 0.80) < 0.001);

        hs._reset();
        // score=0.60, failure → actualStability=0.0 → decisionError=0.60 → fm=1-0.60=0.40
        hs.record(mockTxWithLattice({ fm: 0.70, dt: 0.50, score: 0.60, result: { statusCode: 500 } }));
        const snap2 = hs.getHealthSnapshot();
        assert('5.02 failure → lower fmStabilityScore', snap2.fmStabilityScore < 0.5);
        assert('5.03 fmStabilityScore = 0.4000', Math.abs(snap2.fmStabilityScore - 0.40) < 0.001);

        hs._reset();
    }

    // ── Section 6: dtStabilityScore = 1 - avg(driftDelta) ────────────────────
    {
        hs._reset();
        // FM=0.80, DT=0.50 → driftDelta=0.30 → dtStabilityScore=0.70
        hs.record(mockTxWithLattice({ fm: 0.80, dt: 0.50, score: 0.70, result: { statusCode: 200 } }));
        const snap = hs.getHealthSnapshot();
        assert('6.01 dtStabilityScore = 0.7000', Math.abs(snap.dtStabilityScore - 0.70) < 0.001);
        assert('6.02 systemDriftIndex = 0.3000', Math.abs(snap.systemDriftIndex - 0.30) < 0.001);

        hs._reset();
        // FM=DT=0.70 → driftDelta=0 → dtStabilityScore=1.0
        hs.record(mockTxWithLattice({ fm: 0.70, dt: 0.70, score: 0.70, result: { statusCode: 200 } }));
        const snap2 = hs.getHealthSnapshot();
        assert('6.03 perfect alignment → dtStability=1.0', Math.abs(snap2.dtStabilityScore - 1.00) < 0.001);
        assert('6.04 perfect alignment → driftIndex=0.0',  Math.abs(snap2.systemDriftIndex - 0.00) < 0.001);

        hs._reset();
    }

    // ── Section 7: systemDriftIndex is complement of dtStabilityScore ─────────
    {
        hs._reset();
        hs.record(mockTxWithLattice({ fm: 0.90, dt: 0.40, score: 0.65, result: { statusCode: 200 } }));
        const snap = hs.getHealthSnapshot();
        assert('7.01 driftIndex + dtStability = 1.0',
            Math.abs(snap.systemDriftIndex + snap.dtStabilityScore - 1.0) < 0.001);

        hs._reset();
    }

    // ── Section 8: constitutionalPressureIndex ────────────────────────────────
    {
        hs._reset();
        // 3 ALLOW, 1 WARN, 1 RESTRICT → pressure = 2/5 = 0.40
        hs.record(mockTxWithLattice({ verdict: 'ALLOW' }));
        hs.record(mockTxWithLattice({ verdict: 'ALLOW' }));
        hs.record(mockTxWithLattice({ verdict: 'ALLOW' }));
        hs.record(mockTxWithLattice({ verdict: 'WARN' }));
        hs.record(mockTxWithLattice({ verdict: 'RESTRICT' }));

        const snap = hs.getHealthSnapshot();
        assert('8.01 sampleSize = 5',        snap.sampleSize === 5);
        assert('8.02 pressureIndex = 0.40',  Math.abs(snap.constitutionalPressureIndex - 0.40) < 0.001);

        hs._reset();
        // All ALLOW → pressure = 0
        for (let i = 0; i < 5; i++) hs.record(mockTxWithLattice({ verdict: 'ALLOW' }));
        const snap2 = hs.getHealthSnapshot();
        assert('8.03 all ALLOW → pressure=0', snap2.constitutionalPressureIndex === 0);

        hs._reset();
        // All non-ALLOW → pressure = 1
        for (let i = 0; i < 5; i++) hs.record(mockTxWithLattice({ verdict: 'DENY' }));
        const snap3 = hs.getHealthSnapshot();
        assert('8.04 all DENY → pressure=1', snap3.constitutionalPressureIndex === 1.0);

        hs._reset();
    }

    // ── Section 9: rolling average across multiple records ────────────────────
    {
        hs._reset();
        // Two records: driftDeltas 0.20 and 0.40 → avg=0.30 → dtStability=0.70
        hs.record(mockTxWithLattice({ fm: 0.80, dt: 0.60, score: 0.70, result: { statusCode: 200 } }));  // drift=0.20
        hs.record(mockTxWithLattice({ fm: 0.80, dt: 0.40, score: 0.60, result: { statusCode: 200 } }));  // drift=0.40

        const snap = hs.getHealthSnapshot();
        assert('9.01 sampleSize = 2',             snap.sampleSize === 2);
        assert('9.02 avg driftDelta = 0.30',      Math.abs(snap.systemDriftIndex - 0.30) < 0.001);
        assert('9.03 dtStabilityScore = 0.70',    Math.abs(snap.dtStabilityScore - 0.70) < 0.001);

        hs._reset();
    }

    // ── Section 10: window eviction at WINDOW_SIZE ────────────────────────────
    {
        hs._reset();
        // Fill 1001 entries — oldest should be evicted
        for (let i = 0; i < 1001; i++) {
            hs.record(mockTxWithLattice({ fm: 0.60 + (i % 2) * 0.10, dt: 0.50 }));
        }
        const snap = hs.getHealthSnapshot();
        assert('10.01 window capped at 1000', snap.sampleSize === 1000);
        assert('10.02 metrics still valid',   isNum(snap.fmStabilityScore));

        hs._reset();
    }

    // ── Section 11: record() with null fields skips entry ────────────────────
    {
        hs._reset();
        // FM = null (constitution DENY short-circuited lattice)
        hs.record({ txId: 'TX-X', latticeDecision: { founderAlignmentScore: null, digitalTwinPrediction: null, finalDecisionScore: 0, constitutionVerdict: 'DENY' }, result: { statusCode: 403 }, invariantReport: { criticalFailed: 0 }, compensations: [] });
        const snap = hs.getHealthSnapshot();
        assert('11.01 null FM/DT → no entry added', snap.sampleSize === 0);

        hs._reset();
    }

    // ── Section 12: record(null) and record({}) are safe ─────────────────────
    {
        hs._reset();
        hs.record(null);
        hs.record({});
        hs.record({ txId: 'TX-X' });              // no latticeDecision
        hs.record({ latticeDecision: null });     // explicit null
        assert('12.01 null/missing args safe', hs.getHealthSnapshot().sampleSize === 0);
    }

    // ── Section 13: reset() clears window ────────────────────────────────────
    {
        hs._reset();
        for (let i = 0; i < 5; i++) hs.record(mockTxWithLattice());
        assert('13.01 records present before reset', hs.getHealthSnapshot().sampleSize === 5);

        hs.reset();
        assert('13.02 reset clears window',          hs.getHealthSnapshot().sampleSize === 0);
        assert('13.03 snapshot nulls after reset',   isNull(hs.getHealthSnapshot().fmStabilityScore));
    }

    // ── Section 14: snapshot is frozen (no mutation) ──────────────────────────
    {
        hs._reset();
        hs.record(mockTxWithLattice());
        const snap = hs.getHealthSnapshot();
        assert('14.01 snapshot is frozen', Object.isFrozen(snap));

        let threw = false;
        try { snap.fmStabilityScore = 999; } catch (_) { threw = true; }
        assert('14.02 mutation throws in strict mode', threw);

        hs._reset();
    }

    // ── Section 15: integration through finalize() ────────────────────────────
    {
        hs._reset(); et._reset(); csm._reset(); clog._reset(); fb._reset();
        lattice._reset();
        lattice._inject({
            founderScore: async () => ({ score: 75, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.25, proceed: true }),
        });

        const tx = await et.beginWithLattice(mockReq());
        et.finalize(tx.txId, { statusCode: 200, body: {} });

        const snap = hs.getHealthSnapshot();
        assert('15.01 finalize() populates health signal', snap.sampleSize === 1);
        assert('15.02 fmStabilityScore present',           isNum(snap.fmStabilityScore));
        assert('15.03 dtStabilityScore present',           isNum(snap.dtStabilityScore));
        assert('15.04 systemDriftIndex present',           isNum(snap.systemDriftIndex));
        assert('15.05 pressureIndex present',              isNum(snap.constitutionalPressureIndex));
        assert('15.06 no decision change (PETL unchanged)', tx.latticeDecision.finalDecisionScore > 0);

        lattice._reset(); hs._reset(); et._reset(); csm._reset(); clog._reset(); fb._reset();
    }

    // ── Section 16: metrics are purely observational (no mutation check) ──────
    {
        hs._reset();
        // Record many entries and verify nothing in the lattice module changed
        for (let i = 0; i < 10; i++) {
            hs.record(mockTxWithLattice({ fm: 0.60, dt: 0.40, score: 0.50 }));
        }
        const snap = hs.getHealthSnapshot();
        // The lattice constants should be unchanged by health recording
        const dl = require('./lib/runtime/decision-lattice');
        assert('16.01 W_FM unchanged',      dl.W_FM   === 0.5);
        assert('16.02 W_DT unchanged',      dl.W_DT   === 0.3);
        assert('16.03 W_RISK unchanged',    dl.W_RISK  === 0.2);
        assert('16.04 T_ALLOW unchanged',   dl.T_ALLOW  === 0.70);
        assert('16.05 T_WARN unchanged',    dl.T_WARN   === 0.50);
        assert('16.06 health has sample',   snap.sampleSize === 10);

        hs._reset();
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

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
