'use strict';
// validate-feedback.js — lattice-feedback-loop unit tests

const fb  = require('./lib/runtime/lattice-feedback-loop');
const et  = require('./lib/runtime/execution-transaction');
const csm = require('./lib/runtime/concurrency-slot-manager');
const clog = require('./lib/runtime/compensation-log');
const lattice = require('./lib/runtime/decision-lattice');

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
function isArr(v)  { return Array.isArray(v); }

function mockReq(overrides = {}) {
    return { method: 'GET', path: '/api/test', url: '/api/test', headers: {}, user: null, body: null, ...overrides };
}

async function main() {

    // ── Section 1: Module exports ─────────────────────────────────────────────
    {
        assert('1.01 record is function',    typeof fb.record    === 'function');
        assert('1.02 getAll is function',    typeof fb.getAll    === 'function');
        assert('1.03 getLast is function',   typeof fb.getLast   === 'function');
        assert('1.04 getStats is function',  typeof fb.getStats  === 'function');
        assert('1.05 _reset is function',    typeof fb._reset    === 'function');
    }

    // ── Section 2: record() with no-lattice tx (direct begin) ────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        et.finalize(tx.txId, { statusCode: 200, body: { ok: true } });

        const records = fb.getAll();
        assert('2.01 finalize produces 1 record',   records.length === 1);
        const r = records[0];
        assert('2.02 record.id starts with FB-',    isStr(r.id) && r.id.startsWith('FB-'));
        assert('2.03 record.txId matches tx',       r.txId === tx.txId);
        assert('2.04 noLattice = true',             r.noLattice === true);
        assert('2.05 driftDelta = null',            r.driftDelta === null);
        assert('2.06 decisionError = null',         r.decisionError === null);
        assert('2.07 constitutionVerdict = null',   r.constitutionVerdict === null);
        assert('2.08 outcome.success = true',       r.outcome.success === true);
        assert('2.09 outcome.statusCode = 200',     r.outcome.statusCode === 200);
        assert('2.10 timestamp is string',          isStr(r.timestamp));
        assert('2.11 record is frozen',             Object.isFrozen(r));

        fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 3: record() with lattice tx (via beginWithLattice) ────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        lattice._inject({
            founderScore: async () => ({ score: 75, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.25, proceed: true }),
        });

        const tx = await et.beginWithLattice(mockReq());
        et.finalize(tx.txId, { statusCode: 200, body: { done: true } });

        const records = fb.getAll();
        assert('3.01 finalize produces 1 record',        records.length === 1);
        const r = records[0];
        assert('3.02 no noLattice flag',                 r.noLattice !== true);
        assert('3.03 constitutionVerdict is string',     isStr(r.constitutionVerdict));
        assert('3.04 founderAlignmentScore is num',      isNum(r.founderAlignmentScore));
        assert('3.05 digitalTwinPrediction is num',      isNum(r.digitalTwinPrediction));
        assert('3.06 finalDecisionScore is num',         isNum(r.finalDecisionScore));
        assert('3.07 driftDelta is num',                 isNum(r.driftDelta));
        assert('3.08 decisionError is num',              isNum(r.decisionError));
        assert('3.09 outcome.success = true',            r.outcome.success === true);
        assert('3.10 record is frozen',                  Object.isFrozen(r));

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 4: driftDelta computation ─────────────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        // FM=0.80, DT=0.50 → driftDelta = |0.80 - 0.50| = 0.30
        lattice._inject({
            founderScore: async () => ({ score: 80, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.50, proceed: true }),
        });

        const tx = await et.beginWithLattice(mockReq());
        et.finalize(tx.txId, { statusCode: 200, body: {} });

        const r = fb.getAll()[0];
        const fm = r.founderAlignmentScore;   // 0.80
        const dt = r.digitalTwinPrediction;   // 0.50
        assert('4.01 driftDelta = |FM - DT|', Math.abs(r.driftDelta - Math.abs(fm - dt)) < 0.001);
        assert('4.02 driftDelta in [0,1]',    r.driftDelta >= 0 && r.driftDelta <= 1);
        assert('4.03 driftDelta = 0.30',      Math.abs(r.driftDelta - 0.30) < 0.001);

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 5: decisionError — success case ───────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        // High score ~0.75, successful outcome → decisionError = |0.75 - 1.0| = 0.25
        lattice._inject({
            founderScore: async () => ({ score: 75, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.25, proceed: true }),
        });

        const tx = await et.beginWithLattice(mockReq());
        et.finalize(tx.txId, { statusCode: 200, body: {} });

        const r = fb.getAll()[0];
        const expectedError = Math.abs(r.finalDecisionScore - 1.0);
        assert('5.01 decisionError = |score - 1.0| on success',  Math.abs(r.decisionError - expectedError) < 0.001);
        assert('5.02 success outcome reduces decisionError',      r.decisionError < 0.5);

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 6: decisionError — failure case ───────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        // Lattice gives ~0.75 score but request fails (500) → decisionError = |0.75 - 0.0| ≈ 0.75
        lattice._inject({
            founderScore: async () => ({ score: 75, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.25, proceed: true }),
        });

        const tx = await et.beginWithLattice(mockReq());
        et.finalize(tx.txId, { statusCode: 500, body: { error: 'boom' } });

        const r = fb.getAll()[0];
        assert('6.01 outcome.success = false on 500',     r.outcome.success === false);
        assert('6.02 outcome.statusCode = 500',           r.outcome.statusCode === 500);
        // decisionError = |finalDecisionScore - 0.0|
        assert('6.03 decisionError = |score - 0.0|',      Math.abs(r.decisionError - r.finalDecisionScore) < 0.001);
        assert('6.04 decisionError is higher on failure',  r.decisionError > 0.5);

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 7: outcome with 4xx status ───────────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        lattice._inject({
            founderScore: async () => ({ score: 60, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.3, proceed: true }),
        });

        const tx = await et.beginWithLattice(mockReq());
        et.finalize(tx.txId, { statusCode: 404, body: { error: 'not found' } });

        const r = fb.getAll()[0];
        assert('7.01 4xx → outcome.success = false', !r.outcome.success);
        assert('7.02 399 → success',                 (() => {
            fb._reset(); et._reset(); csm._reset(); clog._reset();
            const tx2 = et.begin(mockReq({ path: '/api/other', url: '/api/other' }));
            et.finalize(tx2.txId, { statusCode: 302, body: {} });
            const r2 = fb.getAll()[0];
            fb._reset();
            return r2.outcome.statusCode === 302 && r2.outcome.success === true;
        })());

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 8: append-only — multiple transactions ────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        lattice._inject({
            founderScore: async () => ({ score: 70, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.3, proceed: true }),
        });

        for (const path of ['/api/a', '/api/b', '/api/c']) {
            const req = mockReq({ path, url: path });
            const tx  = await et.beginWithLattice(req);
            et.finalize(tx.txId, { statusCode: 200, body: {} });
        }

        const all = fb.getAll();
        assert('8.01 3 records accumulated',      all.length === 3);
        assert('8.02 ids are unique',             new Set(all.map(r => r.id)).size === 3);
        assert('8.03 txIds are unique',           new Set(all.map(r => r.txId)).size === 3);
        assert('8.04 all frozen',                 all.every(r => Object.isFrozen(r)));

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 9: getLast(n) ─────────────────────────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();

        for (let i = 0; i < 5; i++) {
            const req = mockReq({ path: `/api/${i}`, url: `/api/${i}` });
            const tx  = et.begin(req);
            et.finalize(tx.txId, { statusCode: 200 });
        }

        const last2 = fb.getLast(2);
        assert('9.01 getLast(2) returns 2',      last2.length === 2);
        assert('9.02 last is most recent',       last2[1].txId !== last2[0].txId);

        const last10 = fb.getLast(10);
        assert('9.03 getLast(10) capped at 5',  last10.length === 5);

        fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 10: getStats() ────────────────────────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();
        lattice._reset();
        lattice._inject({
            founderScore: async () => ({ score: 80, recommendation: 'proceed', triggered_anti_goals: [] }),
            dtEvaluate:   async () => ({ simulated: true, riskEstimate: 0.20, proceed: true }),
        });

        // 2 successes + 1 failure
        for (const [path, code] of [['/a', 200], ['/b', 200], ['/c', 500]]) {
            const req = mockReq({ path, url: path });
            const tx  = await et.beginWithLattice(req);
            et.finalize(tx.txId, { statusCode: code });
        }

        const stats = fb.getStats();
        assert('10.01 stats.total = 3',           stats.total === 3);
        assert('10.02 stats.withLattice = 3',     stats.withLattice === 3);
        assert('10.03 avgDriftDelta is num',       isNum(stats.avgDriftDelta));
        assert('10.04 avgDecisionError is num',    isNum(stats.avgDecisionError));
        assert('10.05 failureCount = 1',          stats.failureCount === 1);
        assert('10.06 successRate ≈ 0.667',       Math.abs(stats.successRate - 0.6667) < 0.001);
        assert('10.07 avgDriftDelta ≥ 0',         stats.avgDriftDelta >= 0);
        assert('10.08 avgDecisionError ≥ 0',      stats.avgDecisionError >= 0);

        lattice._reset(); fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 11: getStats() with no records ────────────────────────────────
    {
        fb._reset();
        const stats = fb.getStats();
        assert('11.01 empty stats.total = 0',    stats.total === 0);
        assert('11.02 empty stats returns obj',  isObj(stats));
    }

    // ── Section 12: record() returns id ───────────────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        const id  = fb.record(tx);   // before finalize (no result yet)
        assert('12.01 record returns string id', isStr(id));
        assert('12.02 id starts with FB-',       id.startsWith('FB-'));

        fb._reset(); et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 13: record(null) is safe ──────────────────────────────────────
    {
        fb._reset();
        const r = fb.record(null);
        assert('13.01 record(null) returns null', r === null);
        assert('13.02 no record appended',        fb.getAll().length === 0);
    }

    // ── Section 14: _reset clears all records ────────────────────────────────
    {
        fb._reset(); et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        et.finalize(tx.txId, { statusCode: 200 });
        assert('14.01 record present before reset', fb.getAll().length === 1);

        fb._reset();
        assert('14.02 reset clears all records',    fb.getAll().length === 0);
        assert('14.03 stats.total = 0 after reset', fb.getStats().total === 0);

        fb._reset(); et._reset(); csm._reset(); clog._reset();
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
