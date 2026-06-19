'use strict';
// validate-petl.js — Behavioural validation for the Pre-Execution Transaction Layer
// 130+ sequential tests in a single async main() to prevent state cross-contamination

const clog  = require('./lib/runtime/compensation-log');
const csm   = require('./lib/runtime/concurrency-slot-manager');
const ic    = require('./lib/runtime/invariant-compiler');
const cp    = require('./lib/runtime/constitutional-preflight');
const et    = require('./lib/runtime/execution-transaction');
const mw    = require('./lib/runtime/petl-middleware');

// ── Harness ───────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? ': ' + detail : ''}`); }
}
function isStr(v)  { return typeof v === 'string'; }
function isNum(v)  { return typeof v === 'number' && isFinite(v); }
function isArr(v)  { return Array.isArray(v); }
function isBool(v) { return typeof v === 'boolean'; }
function isObj(v)  { return v !== null && typeof v === 'object' && !Array.isArray(v); }

// ── Fixtures ──────────────────────────────────────────────────────────────────
function mockReq(overrides = {}) {
    return {
        method:  'GET',
        path:    '/api/test',
        url:     '/api/test',
        headers: {},
        user:    null,
        ...overrides,
    };
}

function mockRes() {
    let _body = null, _status = 200;
    const res = {
        statusCode: 200,
        _body:      null,
        status(code) { _status = code; this.statusCode = code; return this; },
        json(body)   { _body = body; this._body = body; return this; },
        send(body)   { _body = body; this._body = body; return this; },
        getBody()    { return _body; },
    };
    return res;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {

    // ── Section 1: Module exports ─────────────────────────────────────────────
    {
        assert('1.01 clog.TYPES is object',          isObj(clog.TYPES));
        assert('1.02 clog.record is function',       typeof clog.record    === 'function');
        assert('1.03 clog.getByTx is function',      typeof clog.getByTx   === 'function');
        assert('1.04 csm.reserve is function',       typeof csm.reserve    === 'function');
        assert('1.05 csm.release is function',       typeof csm.release    === 'function');
        assert('1.06 csm.deriveKey is function',     typeof csm.deriveKey  === 'function');
        assert('1.07 ic.compile is function',        typeof ic.compile     === 'function');
        assert('1.08 ic.evaluate is function',       typeof ic.evaluate    === 'function');
        assert('1.09 ic.INVARIANT is object',        isObj(ic.INVARIANT));
        assert('1.10 cp.run is function',            typeof cp.run         === 'function');
        assert('1.11 et.TX_STATE is object',         isObj(et.TX_STATE));
        assert('1.12 et.begin is function',          typeof et.begin       === 'function');
        assert('1.13 et.finalize is function',       typeof et.finalize    === 'function');
        assert('1.14 et.abort is function',          typeof et.abort       === 'function');
        assert('1.15 et.boundMemoryWrite is fn',     typeof et.boundMemoryWrite === 'function');
        assert('1.16 et.PetlError is class',         typeof et.PetlError   === 'function');
        assert('1.17 mw.petlGate is function',       typeof mw.petlGate    === 'function');
        assert('1.18 mw.petlErrorHandler is fn',     typeof mw.petlErrorHandler === 'function');
        assert('1.19 mw.BYPASS_PATHS is Set',        mw.BYPASS_PATHS instanceof Set);
        assert('1.20 mw.assertTransaction is fn',    typeof mw.assertTransaction === 'function');
    }

    // ── Section 2: compensation-log ───────────────────────────────────────────
    {
        clog._reset();

        const id1 = clog.record('TX-001', clog.TYPES.PREFLIGHT_FAILED, 'RATE_LIMIT', 'too many requests');
        assert('2.01 record returns string id', isStr(id1));
        assert('2.02 id starts with COMP-',    id1.startsWith('COMP-'));

        const events = clog.getByTx('TX-001');
        assert('2.03 getByTx returns array', isArr(events));
        assert('2.04 getByTx has 1 event',   events.length === 1);
        assert('2.05 event has txId',         events[0].txId === 'TX-001');
        assert('2.06 event has type',         events[0].type === clog.TYPES.PREFLIGHT_FAILED);
        assert('2.07 event has stage',        events[0].stage === 'RATE_LIMIT');
        assert('2.08 event has reason',       events[0].reason === 'too many requests');
        assert('2.09 event has recordedAt',   isStr(events[0].recordedAt));
        assert('2.10 event has seq',          isNum(events[0].seq));

        assert('2.11 hasCompensations true',  clog.hasCompensations('TX-001'));
        assert('2.12 hasCompensations false', !clog.hasCompensations('TX-999'));
        assert('2.13 count = 1',              clog.count('TX-001') === 1);
        assert('2.14 count missing = 0',      clog.count('TX-999') === 0);

        // multiple events per txId
        clog.record('TX-001', clog.TYPES.ABORT_REQUESTED, 'UNKNOWN', 'test');
        assert('2.15 count grows',            clog.count('TX-001') === 2);

        // unknown type throws
        let threw = false;
        try { clog.record('TX-001', 'MADE_UP_TYPE', 'S', 'r'); } catch (_) { threw = true; }
        assert('2.16 unknown type throws',    threw);

        // missing txId throws
        threw = false;
        try { clog.record(null, clog.TYPES.PREFLIGHT_FAILED, 'S', 'r'); } catch (_) { threw = true; }
        assert('2.17 null txId throws',       threw);

        const s = clog.stats();
        assert('2.18 stats has total',        isNum(s.total) && s.total > 0);
        assert('2.19 stats has byType',       isObj(s.byType));
        assert('2.20 stats has txCount',      isNum(s.txCount) && s.txCount > 0);

        clog._reset();
    }

    // ── Section 3: concurrency-slot-manager ───────────────────────────────────
    {
        csm._reset();

        const key = csm.deriveKey('GET', '/api/test', 'user1');
        assert('3.01 deriveKey returns string',    isStr(key));
        assert('3.02 deriveKey contains method',   key.includes('GET'));
        assert('3.03 deriveKey contains path',     key.includes('/api/test'));
        assert('3.04 deriveKey contains userId',   key.includes('user1'));

        // strips query string
        const key2 = csm.deriveKey('POST', '/api/test?x=1', 'u');
        assert('3.05 deriveKey strips query',      !key2.includes('?'));

        // reserve succeeds on free slot
        const r1 = csm.reserve(key, 'TX-111');
        assert('3.06 reserve ok on free slot',     r1.ok === true);

        // isFree = false after reserve
        assert('3.07 isFree false after reserve',  !csm.isFree(key));

        // owner returns txId
        assert('3.08 owner returns txId',          csm.owner(key) === 'TX-111');

        // second reserve on same key fails
        const r2 = csm.reserve(key, 'TX-222');
        assert('3.09 reserve fails on occupied',   r2.ok === false);
        assert('3.10 reason SLOT_OCCUPIED',        r2.reason === 'SLOT_OCCUPIED');
        assert('3.11 existingTxId returned',       r2.existingTxId === 'TX-111');

        // release by txId
        const rel = csm.release('TX-111');
        assert('3.12 release ok',                  rel.ok === true);
        assert('3.13 released = 1',                rel.released === 1);

        // isFree = true after release
        assert('3.14 isFree true after release',   csm.isFree(key));

        // second reserve now succeeds
        const r3 = csm.reserve(key, 'TX-222');
        assert('3.15 reserve ok after release',    r3.ok === true);

        // release returns ok even on unknown txId
        const rel2 = csm.release('TX-UNKNOWN');
        assert('3.16 release unknown txId ok',     rel2.ok === true && rel2.released === 0);

        // getStats structure
        const stats = csm.getStats();
        assert('3.17 stats.activeSlots is num',    isNum(stats.activeSlots));
        assert('3.18 stats.maxSlots = 200',        stats.maxSlots === 200);
        assert('3.19 stats.slotTtlMs = 30000',     stats.slotTtlMs === 30_000);

        // invalid inputs
        const rBad = csm.reserve('', 'TX-X');
        assert('3.20 empty slotKey fails',         rBad.ok === false);

        csm._reset();
    }

    // ── Section 4: invariant-compiler ────────────────────────────────────────
    {
        const stages = [
            { name: 'AUTH',        passed: true,  data: { userId: 'u1', identity: { userId: 'u1' } } },
            { name: 'RATE_LIMIT',  passed: true,  data: { remaining: 99 } },
            { name: 'CONCURRENCY', passed: true,  data: { slotKey: 'GET:/api/test:u1' } },
            { name: 'CONSTITUTION',passed: true,  data: { verdict: 'ALLOW', risks: [] } },
            { name: 'MEMORY',      passed: true,  data: { available: true } },
        ];
        const txMeta = { txId: 'TX-12345-00001-abcd1234', method: 'GET', path: '/api/test', userId: 'u1' };

        const compiled = ic.compile(stages, txMeta);
        assert('4.01 compile returns array',      isArr(compiled));
        assert('4.02 has at least 5 invariants',  compiled.length >= 5); // one per stage + TX_WELL_FORMED
        assert('4.03 each has name',              compiled.every(i => isStr(i.name)));
        assert('4.04 each has predicate fn',      compiled.every(i => typeof i.predicate === 'function'));
        assert('4.05 each has critical bool',     compiled.every(i => isBool(i.critical)));
        assert('4.06 each has description',       compiled.every(i => isStr(i.description)));

        const report = ic.evaluate(compiled, txMeta.txId);
        assert('4.07 report.txId matches',        report.txId === txMeta.txId);
        assert('4.08 report.allPassed true',      report.allPassed === true);
        assert('4.09 report.criticalFailed = 0',  report.criticalFailed === 0);
        assert('4.10 report.totalChecked ≥ 5',    report.totalChecked >= 5);
        assert('4.11 report.results is array',    isArr(report.results));
        assert('4.12 report.generatedAt exists',  isStr(report.generatedAt));
        assert('4.13 each result has name',       report.results.every(r => isStr(r.name)));
        assert('4.14 each result has result bool',report.results.every(r => isBool(r.result)));
        assert('4.15 each result has evidence',   report.results.every(r => r.evidence !== undefined));

        // Failed stage → invariant fails
        const failedStages = [
            { name: 'RATE_LIMIT', passed: false, reason: 'rate exceeded', data: { remaining: 0 } },
            { name: 'CONCURRENCY',passed: true,  data: { slotKey: 'k' } },
        ];
        const fc = ic.compile(failedStages, txMeta);
        const fr = ic.evaluate(fc, txMeta.txId);
        assert('4.16 failed stage → allPassed false',   fr.allPassed === false);
        assert('4.17 critical fail counted',            fr.criticalFailed >= 1);

        // TX_WELL_FORMED invariant: bad txId
        const badMeta = { txId: 'BAD-ID', method: 'GET', path: '/' };
        const bc      = ic.compile([], badMeta);
        const br      = ic.evaluate(bc, badMeta.txId);
        assert('4.18 bad txId fails TX_WELL_FORMED',   !br.allPassed);

        // Predicate that throws → result false, not crash
        const throwing = [{ name: 'X', critical: true, description: 'd', predicate: () => { throw new Error('oops'); } }];
        const tr = ic.evaluate(throwing, 'TX-T');
        assert('4.19 throwing predicate → result false', tr.results[0].result === false);
        assert('4.20 throwing predicate has error',      isStr(tr.results[0].error));
    }

    // ── Section 5: constitutional-preflight ───────────────────────────────────
    {
        // Basic structure check — runs actual constitution modules
        const ctx = { identity: { roles: [] }, metadata: { path: '/api/test', method: 'GET' } };
        const result = cp.run(ctx);

        assert('5.01 run returns object',        isObj(result));
        assert('5.02 name = CONSTITUTION',       result.name === 'CONSTITUTION');
        assert('5.03 passed is boolean',         isBool(result.passed));
        assert('5.04 data is object',            isObj(result.data));
        assert('5.05 data.verdict is string',    isStr(result.data.verdict));
        assert('5.06 data.risks is array',       isArr(result.data.risks));
        assert('5.07 data.auditTrail is array',  isArr(result.data.auditTrail));
        assert('5.08 data.durationMs is num',    isNum(result.data.durationMs));
        assert('5.09 data.failedOpen is bool',   isBool(result.data.failedOpen));

        // Timeout path produces passed:false (we can't force an actual gate timeout easily,
        // but we verify the PREFLIGHT_TIMEOUT_MS constant is tighter than the gate default)
        assert('5.10 PETL timeout < gate default', cp.PREFLIGHT_TIMEOUT_MS < 400);

        // Normal GET with no roles → constitution should not DENY (no authority rejection for normal ops)
        // The exact verdict depends on constitution modules — just check structure
        assert('5.11 result has reason or undefined', result.reason === undefined || isStr(result.reason));

        // Verify fail-closed on internal exception:
        // We cannot easily force cp internals to throw without mocking,
        // but we verify the try/catch structure by checking returned shape is consistent.
        assert('5.12 data.error absent on success', result.passed ? (result.data.error === undefined || result.data.error === null) : true);
    }

    // ── Section 6: execution-transaction.begin() ──────────────────────────────
    {
        et._reset();
        csm._reset();
        clog._reset();

        // Successful begin
        const req  = mockReq();
        const tx   = et.begin(req);
        assert('6.01 begin returns object',         isObj(tx));
        assert('6.02 tx.txId starts with TX-',      isStr(tx.txId) && tx.txId.startsWith('TX-'));
        assert('6.03 tx.state = COMMITTED',         tx.state === et.TX_STATE.COMMITTED);
        assert('6.04 tx.preflight.passed = true',   tx.preflight.passed === true);
        assert('6.05 tx.preflight.stages ≥ 5',      tx.preflight.stages.length >= 5);
        assert('6.06 tx.compiledInvariants arr',    isArr(tx.compiledInvariants));
        assert('6.07 tx.compensations arr',         isArr(tx.compensations));
        assert('6.08 tx.slotKey is string',         isStr(tx.slotKey));
        assert('6.09 tx.userId is string',          isStr(tx.userId));
        assert('6.10 tx.roles is array',            isArr(tx.roles));
        assert('6.11 tx.startedAt is num',          isNum(tx.startedAt));
        assert('6.12 tx.committedAt is string',     isStr(tx.committedAt));
        assert('6.13 tx.preflightAt is string',     isStr(tx.preflightAt));
        assert('6.14 tx.method = GET',              tx.method === 'GET');
        assert('6.15 tx.path = /api/test',          tx.path === '/api/test');

        // Duplicate request (same method+path+userId) → CONCURRENCY_DENIED
        let threw = false, petlErr = null;
        try { et.begin(mockReq()); } catch (e) { threw = true; petlErr = e; }
        assert('6.16 duplicate req throws PetlError',   threw);
        assert('6.17 error.code CONCURRENCY_DENIED',    petlErr?.code === 'CONCURRENCY_DENIED');
        assert('6.18 error.httpStatus = 429',           petlErr?.httpStatus === 429);
        assert('6.19 error.tx is aborted tx',           petlErr?.tx?.state === et.TX_STATE.ABORTED);
        assert('6.20 aborted tx has compensation',      petlErr?.tx?.compensations.length > 0);

        // After releasing the first tx, second can proceed
        et.finalize(tx.txId);
        const tx2 = et.begin(mockReq());
        assert('6.21 begin ok after finalize',      tx2.state === et.TX_STATE.COMMITTED);
        et.finalize(tx2.txId);

        // Rate limit exceeded
        const rateLimitedReq = mockReq({ headers: { 'x-ratelimit-remaining': '0' } });
        let rlThrew = false, rlErr = null;
        try { et.begin(rateLimitedReq); } catch (e) { rlThrew = true; rlErr = e; }
        assert('6.22 rate limit throws PetlError',   rlThrew);
        assert('6.23 rate limit code correct',       rlErr?.code === 'RATE_LIMIT_EXCEEDED');
        assert('6.24 rate limit status 429',         rlErr?.httpStatus === 429);

        // Different paths get independent slots
        const reqA = mockReq({ path: '/api/a', url: '/api/a' });
        const reqB = mockReq({ path: '/api/b', url: '/api/b' });
        const txA  = et.begin(reqA);
        const txB  = et.begin(reqB);
        assert('6.25 different paths coexist',       txA.state === et.TX_STATE.COMMITTED && txB.state === et.TX_STATE.COMMITTED);
        et.finalize(txA.txId);
        et.finalize(txB.txId);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 7: execution-transaction.finalize() ───────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        const fin = et.finalize(tx.txId, { statusCode: 200, body: { ok: true } });

        assert('7.01 finalize returns tx',           isObj(fin));
        assert('7.02 state = FINALIZED',             fin.state === et.TX_STATE.FINALIZED);
        assert('7.03 invariantReport present',       isObj(fin.invariantReport));
        assert('7.04 report.txId matches',           fin.invariantReport.txId === tx.txId);
        assert('7.05 report.allPassed',              fin.invariantReport.allPassed === true);
        assert('7.06 report.results is arr',         isArr(fin.invariantReport.results));
        assert('7.07 durationMs is num',             isNum(fin.durationMs));
        assert('7.08 slot released after finalize',  csm.isFree(tx.slotKey));
        assert('7.09 result stored on tx',           fin.result?.statusCode === 200);

        // Finalize on already-finalized is a no-op
        const fin2 = et.finalize(tx.txId);
        assert('7.10 double finalize safe',          fin2.state === et.TX_STATE.FINALIZED);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 8: execution-transaction.abort() ──────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        const slotKey = tx.slotKey;

        const aborted = et.abort(tx.txId, 'test abort', 'TEST');
        assert('8.01 abort returns tx',              isObj(aborted));
        assert('8.02 state = ABORTED',              aborted.state === et.TX_STATE.ABORTED);
        assert('8.03 slot released after abort',    csm.isFree(slotKey));
        assert('8.04 abortedAt set',                isStr(aborted.abortedAt));
        assert('8.05 compensations has entry',      aborted.compensations.length > 0);
        assert('8.06 compensation in clog',         clog.hasCompensations(tx.txId));

        // Double abort is idempotent
        const aborted2 = et.abort(tx.txId, 'again');
        assert('8.07 double abort idempotent',      aborted2.state === et.TX_STATE.ABORTED);

        // Abort unknown txId returns null
        const n = et.abort('TX-UNKNOWN', 'test');
        assert('8.08 abort unknown txId = null',    n === null);

        // Cannot finalize an aborted tx
        const fin = et.finalize(tx.txId);
        assert('8.09 finalize after abort = no-op', fin.state === et.TX_STATE.ABORTED);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 9: TX state machine illegal transitions ───────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        // COMMITTED → PENDING is illegal
        // We can only test public API transitions; internal _transition is private.
        // Verify that begin returns COMMITTED (not PENDING or PREFLIGHT)
        assert('9.01 begin exits in COMMITTED',  tx.state === et.TX_STATE.COMMITTED);

        // After finalize, state is FINALIZED
        et.finalize(tx.txId);
        assert('9.02 finalize → FINALIZED',      et.get(tx.txId).state === et.TX_STATE.FINALIZED);

        // PetlError has correct shape
        const e = new et.PetlError('MY_CODE', 'TX-X', 'reason', 422);
        assert('9.03 PetlError.name correct',    e.name === 'PetlError');
        assert('9.04 PetlError.code correct',    e.code === 'MY_CODE');
        assert('9.05 PetlError.txId correct',    e.txId === 'TX-X');
        assert('9.06 PetlError.httpStatus',      e.httpStatus === 422);
        assert('9.07 PetlError instanceof Error',e instanceof Error);
        assert('9.08 PetlError.message correct', e.message === 'reason');

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 10: boundMemoryWrite ──────────────────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());

        // Successful write with verification
        const r1 = await et.boundMemoryWrite(
            tx.txId,
            async () => ({ id: 42, data: 'hello' }),
            async (res) => ({ id: res.id, verified: true })
        );
        assert('10.01 boundWrite ok',              r1.ok === true);
        assert('10.02 boundWrite verified',        r1.verified === true);
        assert('10.03 boundWrite result present',  r1.result?.id === 42);
        assert('10.04 readBack present',           r1.readBack?.verified === true);
        assert('10.05 no compensation on success', tx.compensations.length === 0);

        // Write without readBack → unverified
        const r2 = await et.boundMemoryWrite(tx.txId, async () => 'written');
        assert('10.06 no readBack → unverified',   r2.verified === false && r2.unverified === true);
        assert('10.07 ok still true',              r2.ok === true);

        // Write throws → ok:false, compensation emitted
        const r3 = await et.boundMemoryWrite(tx.txId, async () => { throw new Error('db down'); });
        assert('10.08 throwing write → ok false',  r3.ok === false);
        assert('10.09 throwing write has reason',  isStr(r3.reason));
        assert('10.10 compensation recorded',      tx.compensations.length > 0);

        // ReadBack throws → ok:true, verified:false, compensation
        const prevLen = tx.compensations.length;
        const r4 = await et.boundMemoryWrite(
            tx.txId,
            async () => 'wrote',
            async () => { throw new Error('readback fail'); }
        );
        assert('10.11 readback throws → ok true',   r4.ok === true);
        assert('10.12 readback throws → not verified', r4.verified === false);
        assert('10.13 readback compensation added', tx.compensations.length > prevLen);

        // ReadBack returns null → not verified
        const r5 = await et.boundMemoryWrite(tx.txId, async () => 'w', async () => null);
        assert('10.14 null readback → not verified', r5.verified === false);

        // Write against non-existent txId
        const r6 = await et.boundMemoryWrite('TX-MISSING', async () => 'w');
        assert('10.15 missing txId → ok false',    r6.ok === false);

        et.finalize(tx.txId);
        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 11: et.get() and getStats() ───────────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        assert('11.01 get unknown = null',         et.get('TX-NONE') === null);

        const tx = et.begin(mockReq());
        assert('11.02 get known = tx',             et.get(tx.txId) === tx);

        const stats = et.getStats();
        assert('11.03 stats.total ≥ 1',            stats.total >= 1);
        assert('11.04 stats.byCounts is obj',      isObj(stats.byCounts));
        assert('11.05 COMMITTED count ≥ 1',        (stats.byCounts[et.TX_STATE.COMMITTED] || 0) >= 1);
        assert('11.06 stats.slotStats present',    isObj(stats.slotStats));

        et.finalize(tx.txId);
        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 12: petl-middleware — happy path ──────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const req  = mockReq();
        const res  = mockRes();
        let nextCalled = false;

        mw.petlGate(req, res, () => { nextCalled = true; });

        assert('12.01 next() called on success',   nextCalled);
        assert('12.02 req.txId set',               isStr(req.txId) && req.txId.startsWith('TX-'));
        assert('12.03 req.tx set',                 isObj(req.tx));
        assert('12.04 req.tx.state = COMMITTED',   req.tx.state === et.TX_STATE.COMMITTED);
        assert('12.05 res.json is wrapped',        res.json !== null);
        assert('12.06 res.send is wrapped',        res.send !== null);

        // Calling res.json auto-finalizes
        res.json({ ok: true });
        assert('12.07 tx finalized on res.json',   req.tx.state === et.TX_STATE.FINALIZED);
        assert('12.08 invariantReport generated',  isObj(req.tx.invariantReport));

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 13: petl-middleware — bypass paths ────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        for (const bypassPath of ['/health', '/favicon.ico', '/sw.js', '/manifest.json']) {
            const req = mockReq({ path: bypassPath, url: bypassPath });
            const res = mockRes();
            let nextCalled = false;
            mw.petlGate(req, res, () => { nextCalled = true; });
            assert(`13.x bypass: next() for ${bypassPath}`, nextCalled);
            assert(`13.x bypass: no txId for ${bypassPath}`, req.txId === undefined);
        }

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 14: petl-middleware — rate limit rejection ────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const req = mockReq({ headers: { 'x-ratelimit-remaining': '0' } });
        const res = mockRes();
        let nextCalled = false;
        mw.petlGate(req, res, () => { nextCalled = true; });

        assert('14.01 next NOT called on rate limit', !nextCalled);
        assert('14.02 res status 429',               res.statusCode === 429);
        assert('14.03 body.error = RATE_LIMIT_EXCEEDED', res._body?.error === 'RATE_LIMIT_EXCEEDED');
        assert('14.04 body.petl = true',             res._body?.petl === true);
        assert('14.05 body.aborted = true',          res._body?.aborted === true);
        assert('14.06 body.txId present',            isStr(res._body?.txId));

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 15: petl-middleware — concurrency rejection ───────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const req  = mockReq();
        const res1 = mockRes();
        // First request takes the slot
        mw.petlGate(req, res1, () => {});
        assert('15.01 first request committed', req.tx?.state === et.TX_STATE.COMMITTED);

        // Second identical request → concurrency denied
        const req2 = mockReq();
        const res2 = mockRes();
        let next2Called = false;
        mw.petlGate(req2, res2, () => { next2Called = true; });
        assert('15.02 second request blocked',   !next2Called);
        assert('15.03 second res status 429',    res2.statusCode === 429);
        assert('15.04 second body.error',        res2._body?.error === 'CONCURRENCY_DENIED');

        // Release first and verify second can now proceed
        res1.json({ ok: true }); // auto-finalizes first tx
        const req3 = mockReq();
        const res3 = mockRes();
        let next3Called = false;
        mw.petlGate(req3, res3, () => { next3Called = true; });
        assert('15.05 third request ok after release', next3Called);
        res3.json({});

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 16: petlErrorHandler ──────────────────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const req = mockReq();
        const res = mockRes();
        mw.petlGate(req, res, () => {});

        const slotKey = req.tx.slotKey;
        assert('16.01 slot occupied before error', !csm.isFree(slotKey));

        // Simulate unhandled route error
        const err = new Error('boom');
        mw.petlErrorHandler(err, req, res, () => {});

        assert('16.02 tx aborted after errorHandler', req.tx.state === et.TX_STATE.ABORTED);
        assert('16.03 slot freed after errorHandler', csm.isFree(slotKey));
        assert('16.04 res status 500',               res.statusCode === 500);
        assert('16.05 res body has txId',            res._body?.txId === req.txId);
        assert('16.06 res body.error = INTERNAL',    res._body?.error === 'INTERNAL_ERROR');

        // errorHandler with no req.txId is safe
        const reqNoTx = mockReq();
        const resNoTx = mockRes();
        mw.petlErrorHandler(new Error('x'), reqNoTx, resNoTx, () => {});
        assert('16.07 errorHandler with no txId safe', resNoTx.statusCode === 500);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 17: assertTransaction ─────────────────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        // No tx on req → throws
        let threw = false;
        try { mw.assertTransaction(mockReq()); } catch (_) { threw = true; }
        assert('17.01 assertTransaction throws with no tx', threw);

        // Committed tx → passes
        const req = mockReq();
        const res = mockRes();
        mw.petlGate(req, res, () => {});

        let throws2 = false;
        try { mw.assertTransaction(req); } catch (_) { throws2 = true; }
        assert('17.02 assertTransaction ok when COMMITTED', !throws2);

        // Aborted tx → throws
        et.abort(req.txId, 'test');
        let throws3 = false;
        try { mw.assertTransaction(req); } catch (_) { throws3 = true; }
        assert('17.03 assertTransaction throws when ABORTED', throws3);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 18: Compensation log cross-cutting ────────────────────────────
    {
        clog._reset(); et._reset(); csm._reset();

        // Rate-limit abort → compensation in clog
        const rateLimitedReq = mockReq({ headers: { 'x-ratelimit-remaining': '0' } });
        let rlErr = null;
        try { et.begin(rateLimitedReq); } catch (e) { rlErr = e; }

        const txId = rlErr?.txId;
        assert('18.01 aborted tx has compensations', txId && clog.hasCompensations(txId));
        const events = clog.getByTx(txId);
        assert('18.02 compensation type is PREFLIGHT_FAILED', events[0].type === clog.TYPES.PREFLIGHT_FAILED);
        assert('18.03 compensation stage = RATE_LIMIT',       events[0].stage === 'RATE_LIMIT');

        // Invariant violation → compensation in clog
        const txOk = et.begin(mockReq({ path: '/api/y', url: '/api/y' }));
        // Corrupt the compiled invariant to force a violation
        txOk.compiledInvariants.push({
            name: 'FAKE_CRITICAL', critical: true, description: 'test',
            predicate: () => ({ result: false, evidence: 'forced failure' }),
        });
        et.finalize(txOk.txId);
        const vioComp = clog.getByTx(txOk.txId).filter(e => e.type === clog.TYPES.INVARIANT_VIOLATION);
        assert('18.04 invariant violation → compensation',   vioComp.length > 0);
        assert('18.05 violation stage = INVARIANT',         vioComp[0]?.stage === 'INVARIANT');

        clog._reset(); et._reset(); csm._reset();
    }

    // ── Section 19: et.prune() ────────────────────────────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        const tx = et.begin(mockReq());
        et.finalize(tx.txId);

        // With default maxAgeMs (5 min) nothing pruned yet
        const pruned0 = et.prune(300_000);
        assert('19.01 prune: nothing expired yet',  pruned0 === 0);

        // With maxAgeMs = 0, finalized tx is pruned
        const pruned1 = et.prune(0);
        assert('19.02 prune with 0 maxAge removes tx', pruned1 >= 1);
        assert('19.03 pruned tx no longer in registry', et.get(tx.txId) === null);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Section 20: Zero footprint on failed preflight ────────────────────────
    {
        et._reset(); csm._reset(); clog._reset();

        // Rate limit fail: no slot should be reserved
        const badReq = mockReq({ headers: { 'x-ratelimit-remaining': '0' } });
        try { et.begin(badReq); } catch (_) {}

        const stats = csm.getStats();
        assert('20.01 no slots reserved after rate-limit fail', stats.activeSlots === 0);

        // Concurrency fail: slot released after constitution block
        // (We need a constitutionally-blocked case. Approximate by forcing concurrency.)
        const req1 = mockReq({ path: '/api/z', url: '/api/z' });
        const tx1  = et.begin(req1);
        const req2 = mockReq({ path: '/api/z', url: '/api/z' });
        let concErr = null;
        try { et.begin(req2); } catch (e) { concErr = e; }
        assert('20.02 concurrency fail has zero extra slots', csm.getStats().activeSlots === 1); // only tx1
        assert('20.03 failed tx state = ABORTED', concErr?.tx?.state === et.TX_STATE.ABORTED);

        et.finalize(tx1.txId);
        assert('20.04 slot freed after finalize', csm.getStats().activeSlots === 0);

        et._reset(); csm._reset(); clog._reset();
    }

    // ── Results ───────────────────────────────────────────────────────────────
    console.log(`\nPassed: ${passed} / ${passed + failed}`);
    if (failures.length > 0) {
        console.log('\nFailures:');
        for (const f of failures) console.log(' ', f);
        process.exit(1);
    } else {
        console.log('All tests passed.');
    }
}

main().catch(err => {
    console.error('Fatal error in test runner:', err);
    process.exit(1);
});
