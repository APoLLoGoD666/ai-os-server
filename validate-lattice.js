'use strict';
// validate-lattice.js — Decision Lattice unit tests
// Tests the Constitution → FM → DT unification layer.
// Uses _inject() to override external dependencies (Supabase, LLM) so tests are self-contained.

const lattice = require('./lib/runtime/decision-lattice');
const ic      = require('./lib/runtime/invariant-compiler');

// ── Harness ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? ': ' + detail : ''}`); }
}
function isNum(v)  { return typeof v === 'number' && isFinite(v); }
function isStr(v)  { return typeof v === 'string'; }
function isBool(v) { return typeof v === 'boolean'; }
function isObj(v)  { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// ── Stub factories ────────────────────────────────────────────────────────────
function makeFmStub(score = 50, recommendation = 'proceed_with_caution') {
    return async () => ({ score, recommendation, triggered_values: [], triggered_anti_goals: [], failure_pattern_risk: false });
}

function makeDtStub(riskEstimate = 0.3, simulated = true, proceed = true) {
    return async () => ({ riskEstimate, simulated, proceed, recommendation: 'proceed_with_caution', latencyMs: 10 });
}

// constData helpers
function allowData(riskScore = 0)  { return { verdict: 'ALLOW',    riskScore, risks: [] }; }
function warnData(riskScore = 10)  { return { verdict: 'WARN',     riskScore, risks: ['MINOR'] }; }
function denyData()                { return { verdict: 'DENY',     riskScore: 100, risks: ['AUTH_REJECTED'] }; }
function blockData()               { return { verdict: 'BLOCK',    riskScore: 100, risks: ['BLOCK_REASON'] }; }
function restrictData(r = 40)      { return { verdict: 'RESTRICT', riskScore: r,   risks: ['HIGH_RISK'] }; }

function mockReq(overrides = {}) {
    return { method: 'GET', path: '/api/test', url: '/api/test', body: null, ...overrides };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {

    // ── Section 1: Module exports ─────────────────────────────────────────────
    {
        assert('1.01 evaluate is function',       typeof lattice.evaluate      === 'function');
        assert('1.02 getDriftStats is function',  typeof lattice.getDriftStats === 'function');
        assert('1.03 _inject is function',        typeof lattice._inject       === 'function');
        assert('1.04 _reset is function',         typeof lattice._reset        === 'function');
        assert('1.05 W_FM = 0.5',                lattice.W_FM   === 0.5);
        assert('1.06 W_DT = 0.3',                lattice.W_DT   === 0.3);
        assert('1.07 W_RISK = 0.2',              lattice.W_RISK === 0.2);
        assert('1.08 W sum = 1.0',               Math.abs(lattice.W_FM + lattice.W_DT + lattice.W_RISK - 1.0) < 1e-10);
        assert('1.09 T_ALLOW = 0.70',            lattice.T_ALLOW    === 0.70);
        assert('1.10 T_WARN = 0.50',             lattice.T_WARN     === 0.50);
        assert('1.11 T_RESTRICT = 0.30',         lattice.T_RESTRICT === 0.30);
        assert('1.12 DIVERGENCE_THRESHOLD=0.30', lattice.DIVERGENCE_THRESHOLD === 0.30);
    }

    // ── Section 2: Constitution DENY → immediate hard stop ───────────────────
    {
        lattice._reset();
        let fmCalled = false, dtCalled = false;
        lattice._inject({
            founderScore: async () => { fmCalled = true; return { score: 80, recommendation: 'proceed' }; },
            dtEvaluate:   async () => { dtCalled = true; return { simulated: true, riskEstimate: 0.1 }; },
        });

        const result = await lattice.evaluate(mockReq(), denyData());

        assert('2.01 DENY verdict returned',          result.finalDecision === 'DENY');
        assert('2.02 FM never called on DENY',        !fmCalled);
        assert('2.03 DT never called on DENY',        !dtCalled);
        assert('2.04 founderAlignmentScore = null',   result.founderAlignmentScore === null);
        assert('2.05 digitalTwinPrediction = null',   result.digitalTwinPrediction === null);
        assert('2.06 finalDecisionScore = 0',         result.finalDecisionScore === 0);
        assert('2.07 constitutionVerdict = DENY',     result.constitutionVerdict === 'DENY');
        assert('2.08 reason includes DENY',           isStr(result.reason) && result.reason.includes('DENY'));
        assert('2.09 durationMs is num',              isNum(result.durationMs));
        assert('2.10 driftFlag is bool',              isBool(result.driftFlag));

        lattice._reset();
    }

    // ── Section 3: Constitution BLOCK → immediate hard stop ──────────────────
    {
        lattice._reset();
        let fmCalled = false;
        lattice._inject({ founderScore: async () => { fmCalled = true; return { score: 90, recommendation: 'proceed' }; } });

        const result = await lattice.evaluate(mockReq(), blockData());
        assert('3.01 BLOCK → DENY verdict',       result.finalDecision === 'DENY');
        assert('3.02 FM not called on BLOCK',     !fmCalled);
        assert('3.03 constitutionVerdict=BLOCK',  result.constitutionVerdict === 'BLOCK');

        lattice._reset();
    }

    // ── Section 4: Composite score formula ───────────────────────────────────
    {
        lattice._reset();
        // FM score=80 (→ 0.80 normalised), DT riskEstimate=0.20 (→ coherence=0.80), constRisk=0 (→ 0.00)
        // expected = 0.5*0.80 + 0.3*0.80 + 0.2*(1-0) = 0.40 + 0.24 + 0.20 = 0.84
        lattice._inject({
            founderScore: makeFmStub(80, 'proceed'),
            dtEvaluate:   makeDtStub(0.20),
        });

        const result = await lattice.evaluate(mockReq(), allowData(0));
        assert('4.01 finalDecision = ALLOW',        result.finalDecision === 'ALLOW');
        assert('4.02 score ≈ 0.84',                 Math.abs(result.finalDecisionScore - 0.84) < 0.01);
        assert('4.03 founderAlignmentScore = 0.80', Math.abs(result.founderAlignmentScore - 0.80) < 0.01);
        assert('4.04 digitalTwinPrediction = 0.80', Math.abs(result.digitalTwinPrediction - 0.80) < 0.01);
        assert('4.05 constitutionVerdict = ALLOW',  result.constitutionVerdict === 'ALLOW');
        assert('4.06 breakdown.constitution',       isObj(result.breakdown.constitution));
        assert('4.07 breakdown.founderModel',       isObj(result.breakdown.founderModel));
        assert('4.08 breakdown.digitalTwin',        isObj(result.breakdown.digitalTwin));
        assert('4.09 no reason on ALLOW',           result.reason === undefined);

        lattice._reset();
    }

    // ── Section 5: Score → verdict thresholds ────────────────────────────────
    {
        lattice._reset();

        // ALLOW: score ≥ 0.70
        // FM=80(0.80), DT=risk0(1.00), constRisk=0 → 0.5*0.80+0.3*1.0+0.2*1.0 = 0.40+0.30+0.20 = 0.90
        lattice._inject({ founderScore: makeFmStub(80, 'proceed'), dtEvaluate: makeDtStub(0, true) });
        const r1 = await lattice.evaluate(mockReq(), allowData(0));
        assert('5.01 ALLOW verdict (score=0.90)',   r1.finalDecision === 'ALLOW');
        lattice._reset();

        // WARN: 0.50 ≤ score < 0.70
        // FM=40(0.40), DT=risk0.5(0.50), constRisk=0 → 0.5*0.40+0.3*0.50+0.2*1.0 = 0.20+0.15+0.20 = 0.55
        lattice._inject({ founderScore: makeFmStub(40, 'proceed_with_caution'), dtEvaluate: makeDtStub(0.5) });
        const r2 = await lattice.evaluate(mockReq(), allowData(0));
        assert('5.02 WARN verdict (score≈0.55)',    r2.finalDecision === 'WARN');
        lattice._reset();

        // RESTRICT: 0.30 ≤ score < 0.50
        // FM=10(0.10), DT=risk0.7(0.30), constRisk=50(0.5) → 0.5*0.10+0.3*0.30+0.2*0.5 = 0.05+0.09+0.10 = 0.24
        // Let me recalculate: That's 0.24 → DENY. Let me adjust.
        // FM=20(0.20), DT=risk0.5(0.50), constRisk=20(0.2) → 0.5*0.20+0.3*0.50+0.2*0.8 = 0.10+0.15+0.16 = 0.41
        lattice._inject({ founderScore: makeFmStub(20, 'proceed_with_caution'), dtEvaluate: makeDtStub(0.5) });
        const r3 = await lattice.evaluate(mockReq(), allowData(20));
        assert('5.03 RESTRICT verdict (score≈0.41)', r3.finalDecision === 'RESTRICT');
        lattice._reset();

        // DENY: score < 0.30
        // FM=0(0), DT=risk1(0), constRisk=100(1) → 0.5*0+0.3*0+0.2*0 = 0
        lattice._inject({ founderScore: makeFmStub(0, 'reject'), dtEvaluate: makeDtStub(1.0) });
        const r4 = await lattice.evaluate(mockReq(), allowData(100));
        assert('5.04 DENY verdict (score=0.00)',    r4.finalDecision === 'DENY');
        assert('5.05 reason present on DENY',       isStr(r4.reason));
        lattice._reset();
    }

    // ── Section 6: FM timeout → neutral 0.5 ──────────────────────────────────
    {
        lattice._reset();
        lattice._inject({
            founderScore: () => new Promise(resolve => setTimeout(() => resolve({ score: 99, recommendation: 'proceed' }), 5000)),
            dtEvaluate:   makeDtStub(0.2),
        });

        const result = await lattice.evaluate(mockReq(), allowData(0));
        assert('6.01 FM timeout → neutral 0.5',   Math.abs(result.founderAlignmentScore - 0.5) < 0.01);
        assert('6.02 DT still evaluated',          isNum(result.digitalTwinPrediction));
        assert('6.03 finalDecision is string',     isStr(result.finalDecision));
        assert('6.04 durationMs reasonable',       result.durationMs < 5000);

        lattice._reset();
    }

    // ── Section 7: DT timeout → neutral 0.5 ──────────────────────────────────
    {
        lattice._reset();
        lattice._inject({
            founderScore: makeFmStub(70, 'proceed'),
            dtEvaluate:   () => new Promise(resolve => setTimeout(() => resolve({ simulated: true, riskEstimate: 0.0 }), 5000)),
        });

        const result = await lattice.evaluate(mockReq(), allowData(0));
        assert('7.01 DT timeout → neutral 0.5',   Math.abs(result.digitalTwinPrediction - 0.5) < 0.01);
        assert('7.02 FM still evaluated',          isNum(result.founderAlignmentScore));
        assert('7.03 FM score = 0.70',             Math.abs(result.founderAlignmentScore - 0.70) < 0.01);

        lattice._reset();
    }

    // ── Section 8: FM error (throw) → neutral 0.5 ────────────────────────────
    {
        lattice._reset();
        lattice._inject({
            founderScore: async () => { throw new Error('supabase down'); },
            dtEvaluate:   makeDtStub(0.3),
        });

        const result = await lattice.evaluate(mockReq(), allowData(0));
        assert('8.01 FM error → neutral 0.5',     Math.abs(result.founderAlignmentScore - 0.5) < 0.01);
        assert('8.02 evaluation completes',        isStr(result.finalDecision));
        assert('8.03 breakdown FM has note',       result.breakdown.founderModel.note === 'timeout_or_unavailable');

        lattice._reset();
    }

    // ── Section 9: DT not simulated → neutral 0.5 ────────────────────────────
    {
        lattice._reset();
        lattice._inject({
            founderScore: makeFmStub(60, 'proceed_with_caution'),
            dtEvaluate:   async () => ({ simulated: false, riskEstimate: 0.0, recommendation: 'proceed' }),
        });

        const result = await lattice.evaluate(mockReq(), allowData(0));
        assert('9.01 simulated:false → coherence=0.5', Math.abs(result.digitalTwinPrediction - 0.5) < 0.01);
        assert('9.02 simulated recorded in breakdown',  result.breakdown.digitalTwin.simulated === false);

        lattice._reset();
    }

    // ── Section 10: Constitution WARN/RESTRICT — FM+DT still evaluated ────────
    {
        lattice._reset();
        let fmCalled = false;
        lattice._inject({
            founderScore: async () => { fmCalled = true; return { score: 70, recommendation: 'proceed' }; },
            dtEvaluate:   makeDtStub(0.3),
        });

        const r1 = await lattice.evaluate(mockReq(), warnData(10));
        assert('10.01 WARN → FM evaluated',         fmCalled);
        assert('10.02 WARN → constVerdict=WARN',    r1.constitutionVerdict === 'WARN');
        assert('10.03 WARN → still gets score',     isNum(r1.finalDecisionScore));

        fmCalled = false;
        const r2 = await lattice.evaluate(mockReq(), restrictData(40));
        assert('10.04 RESTRICT → FM evaluated',     fmCalled);
        assert('10.05 RESTRICT constitutionVerdict', r2.constitutionVerdict === 'RESTRICT');

        lattice._reset();
    }

    // ── Section 11: Drift tracking — FM contradicts constitution ─────────────
    {
        lattice._reset();

        // FM says "reject" while constitution says ALLOW → that's a contradiction
        lattice._inject({
            founderScore: makeFmStub(10, 'reject'),
            dtEvaluate:   makeDtStub(0.3),
        });

        // Generate 10+ decisions to meet minimum window size, all with FM contradicting
        for (let i = 0; i < 12; i++) {
            await lattice.evaluate(mockReq(), allowData(0));
        }

        const stats = lattice.getDriftStats();
        assert('11.01 sampleSize >= 10',           stats.sampleSize >= 10);
        assert('11.02 fmDivergenceRate > 0',       stats.fmDivergenceRate > 0);
        assert('11.03 flag active (FM div > 30%)', stats.flagActive === true);

        // Last result should have driftFlag = true
        const r = await lattice.evaluate(mockReq(), allowData(0));
        assert('11.04 driftFlag = true in result', r.driftFlag === true);

        lattice._reset();
    }

    // ── Section 12: Drift tracking — DT contradicts constitution ─────────────
    {
        lattice._reset();

        // DT says proceed:false while constitution says ALLOW → contradiction
        lattice._inject({
            founderScore: makeFmStub(70, 'proceed'),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.8, proceed: false, recommendation: 'do_not_deploy' }),
        });

        for (let i = 0; i < 12; i++) {
            await lattice.evaluate(mockReq(), allowData(0));
        }

        const stats = lattice.getDriftStats();
        assert('12.01 dtDivergenceRate > 0',       stats.dtDivergenceRate > 0);
        assert('12.02 flag active (DT div > 30%)', stats.flagActive === true);

        lattice._reset();
    }

    // ── Section 13: getDriftStats with insufficient data ─────────────────────
    {
        lattice._reset();
        lattice._inject({ founderScore: makeFmStub(80, 'proceed'), dtEvaluate: makeDtStub(0.2) });

        // Fewer than 10 samples
        for (let i = 0; i < 5; i++) {
            await lattice.evaluate(mockReq(), allowData(0));
        }

        const stats = lattice.getDriftStats();
        assert('13.01 sampleSize = 5',    stats.sampleSize === 5);
        assert('13.02 flagActive = false', stats.flagActive === false); // < 10 samples → no flag

        lattice._reset();
    }

    // ── Section 14: No drift when all systems agree ───────────────────────────
    {
        lattice._reset();
        lattice._inject({
            founderScore: makeFmStub(80, 'proceed'),
            dtEvaluate:   makeDtStub(0.2, true, true),  // low risk, proceed=true
        });

        for (let i = 0; i < 15; i++) {
            await lattice.evaluate(mockReq(), allowData(0));
        }

        const stats = lattice.getDriftStats();
        assert('14.01 no FM drift when systems agree',  stats.fmDivergenceRate === 0);
        assert('14.02 no DT drift when systems agree',  stats.dtDivergenceRate === 0);
        assert('14.03 flag not active',                 stats.flagActive === false);

        lattice._reset();
    }

    // ── Section 15: constRisk contribution to composite ──────────────────────
    {
        lattice._reset();
        // FM=50(0.5), DT=risk0.5(0.5), constRisk=100(1.0) → 0.5*0.5+0.3*0.5+0.2*0 = 0.25+0.15+0.0 = 0.40
        lattice._inject({ founderScore: makeFmStub(50, 'proceed_with_caution'), dtEvaluate: makeDtStub(0.5) });
        const r1 = await lattice.evaluate(mockReq(), allowData(100));
        assert('15.01 highRisk lowers score',  r1.finalDecisionScore < 0.45);

        lattice._reset();
        // FM=50(0.5), DT=risk0.5(0.5), constRisk=0 → 0.5*0.5+0.3*0.5+0.2*1.0 = 0.25+0.15+0.20 = 0.60
        lattice._inject({ founderScore: makeFmStub(50, 'proceed_with_caution'), dtEvaluate: makeDtStub(0.5) });
        const r2 = await lattice.evaluate(mockReq(), allowData(0));
        assert('15.02 zeroRisk raises score',  r2.finalDecisionScore > r1.finalDecisionScore);
        assert('15.03 delta = 0.20',           Math.abs(r2.finalDecisionScore - r1.finalDecisionScore - 0.20) < 0.01);

        lattice._reset();
    }

    // ── Section 16: result shape completeness ────────────────────────────────
    {
        lattice._reset();
        lattice._inject({ founderScore: makeFmStub(65, 'proceed'), dtEvaluate: makeDtStub(0.25) });

        const r = await lattice.evaluate(mockReq(), allowData(10));
        assert('16.01 finalDecision present',         isStr(r.finalDecision));
        assert('16.02 constitutionVerdict present',   isStr(r.constitutionVerdict));
        assert('16.03 founderAlignmentScore present', isNum(r.founderAlignmentScore));
        assert('16.04 digitalTwinPrediction present', isNum(r.digitalTwinPrediction));
        assert('16.05 finalDecisionScore present',    isNum(r.finalDecisionScore));
        assert('16.06 breakdown present',             isObj(r.breakdown));
        assert('16.07 driftFlag present',             isBool(r.driftFlag));
        assert('16.08 durationMs present',            isNum(r.durationMs) && r.durationMs >= 0);
        assert('16.09 breakdown.constitution',        isObj(r.breakdown.constitution));
        assert('16.10 breakdown.founderModel',        isObj(r.breakdown.founderModel));
        assert('16.11 breakdown.digitalTwin',         isObj(r.breakdown.digitalTwin));

        lattice._reset();
    }

    // ── Section 17: invariant-compiler handles LATTICE stage ─────────────────
    {
        lattice._reset();
        lattice._inject({ founderScore: makeFmStub(75, 'proceed'), dtEvaluate: makeDtStub(0.2) });

        // Build a LATTICE stage (simulating what beginWithLattice produces)
        const latticeResult = await lattice.evaluate(mockReq(), allowData(0));
        const latticeStage  = {
            name:   'LATTICE',
            passed: latticeResult.finalDecision !== 'DENY',
            reason: latticeResult.reason,
            data:   latticeResult,
        };

        const compiled = ic.compile([latticeStage], { txId: 'TX-TEST', method: 'GET', path: '/api/test', userId: 'u1' });
        // compile() appends TX_WELL_FORMED universally; LATTICE stage adds SYSTEM_COHERENCE → 2 total
        assert('17.01 LATTICE produces ≥ 1 invariant', compiled.length >= 1);
        assert('17.02 invariant is SYSTEM_COHERENCE',   compiled[0].name === ic.INVARIANT.SYSTEM_COHERENCE);
        assert('17.03 SYSTEM_COHERENCE not critical', compiled[0].critical === false);

        const report = ic.evaluate(compiled, 'TX-TEST');
        assert('17.04 report.allPassed = true (no drift)', report.allPassed === true);
        assert('17.05 result.result = true (no drift)',     report.results[0].result === true);

        // With driftFlag = true — invariant should fail
        const driftStage = { ...latticeStage, data: { ...latticeResult, driftFlag: true } };
        const compiled2  = ic.compile([driftStage], { txId: 'TX-TEST2', method: 'GET', path: '/', userId: 'u1' });
        const report2    = ic.evaluate(compiled2, 'TX-TEST2');
        assert('17.06 driftFlag=true → invariant fails',   report2.results[0].result === false);
        assert('17.07 criticalFailed=0 (non-critical)',   report2.criticalFailed === 0);
        assert('17.08 evidence mentions DEGRADATION',     report2.results[0].evidence.includes('DEGRADATION'));

        lattice._reset();
    }

    // ── Section 18: SYSTEM_COHERENCE in INVARIANT constants ──────────────────
    {
        assert('18.01 SYSTEM_COHERENCE in INVARIANT', 'SYSTEM_COHERENCE' in ic.INVARIANT);
        assert('18.02 INVARIANT.SYSTEM_COHERENCE val', ic.INVARIANT.SYSTEM_COHERENCE === 'SYSTEM_COHERENCE');
    }

    // ── Section 19: _reset clears drift and restores injections ──────────────
    {
        lattice._inject({ founderScore: makeFmStub(10, 'reject'), dtEvaluate: makeDtStub(0.9) });
        for (let i = 0; i < 20; i++) {
            await lattice.evaluate(mockReq(), allowData(0));
        }
        const statsBefore = lattice.getDriftStats();
        assert('19.01 flag active before reset', statsBefore.sampleSize > 0);

        lattice._reset();
        const statsAfter = lattice.getDriftStats();
        assert('19.02 reset clears drift',       statsAfter.sampleSize === 0);
        assert('19.03 flagActive=false',         statsAfter.flagActive === false);
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
