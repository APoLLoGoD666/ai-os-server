'use strict';
// lib/runtime/execution-transaction.js
// Core Pre-Execution Transaction Layer (PETL) engine.
//
// Every request must pass begin() before any route handler executes.
// begin() runs all preflight stages in order; the first failure aborts
// the transaction immediately with zero execution footprint.
// A committed transaction gates all downstream execution.
// finalize() produces the per-transaction invariant report.
// abort() records compensation markers and releases concurrency slots.
//
// State machine:
//   PENDING → PREFLIGHT → COMMITTED → EXECUTING → FINALIZED
//                              ↓            ↓
//                           ABORTED ←─────────── (any stage)

const crypto = require('crypto');

const compensationLog  = require('./compensation-log');
const slots            = require('./concurrency-slot-manager');
const invariants       = require('./invariant-compiler');
const constPreflight   = require('./constitutional-preflight');
const lattice          = require('./decision-lattice');

// ── States ────────────────────────────────────────────────────────────────────
const TX_STATE = Object.freeze({
    PENDING:   'PENDING',
    PREFLIGHT: 'PREFLIGHT',
    COMMITTED: 'COMMITTED',
    EXECUTING: 'EXECUTING',
    FINALIZED: 'FINALIZED',
    ABORTED:   'ABORTED',
});

const _TRANSITIONS = {
    [TX_STATE.PENDING]:   [TX_STATE.PREFLIGHT, TX_STATE.ABORTED],
    [TX_STATE.PREFLIGHT]: [TX_STATE.COMMITTED,  TX_STATE.ABORTED],
    [TX_STATE.COMMITTED]: [TX_STATE.EXECUTING,  TX_STATE.FINALIZED, TX_STATE.ABORTED],
    [TX_STATE.EXECUTING]: [TX_STATE.FINALIZED,  TX_STATE.ABORTED],
    [TX_STATE.FINALIZED]: [],
    [TX_STATE.ABORTED]:   [],
};

// ── Registry ──────────────────────────────────────────────────────────────────
const _registry = new Map();
let _txSeq = 0;

// Auto-prune every N transactions to prevent registry growth.
const _PRUNE_EVERY   = 100;
const _PRUNE_AGE_MS  = 300_000; // 5 min
let _txSinceLastPrune = 0;

// ── ID generation ─────────────────────────────────────────────────────────────
function _nextTxId(method, path) {
    _txSeq++;
    const ts   = Date.now();
    const hash = crypto.createHash('sha256')
        .update(`${ts}:${_txSeq}:${method}:${path}`)
        .digest('hex')
        .slice(0, 8);
    return `TX-${ts}-${String(_txSeq).padStart(5, '0')}-${hash}`;
}

// ── State machine ─────────────────────────────────────────────────────────────
function _transition(tx, newState) {
    const allowed = _TRANSITIONS[tx.state] || [];
    if (!allowed.includes(newState)) {
        throw new Error(`Illegal TX transition: ${tx.state} → ${newState} (${tx.txId})`);
    }
    tx.state = newState;
    tx[`${newState.toLowerCase()}At`] = new Date().toISOString();
}

// ── Preflight stage runners ───────────────────────────────────────────────────

function _stageAuth(req) {
    const auth    = req.headers?.authorization || '';
    const apiKey  = req.headers?.['x-api-key'] || req.headers?.['x-access-key'] || '';
    const hasAuth = auth.length > 0 || apiKey.length > 0;
    const user    = req.user || null;

    const userId = user?.id || (hasAuth ? 'key-auth' : 'anonymous');
    const roles  = user?.roles || (hasAuth ? ['API_USER'] : []);

    return {
        name:   'AUTH',
        passed: true,   // PETL records identity state; authentication is done by prior middleware
        data:   { userId, roles, hasAuth, identity: { userId, roles, hasAuth } },
    };
}

function _stageRateLimit(req) {
    // Reads the header injected by express-rate-limit (if wired).
    // Absent header → assume within limit (rate limiter is external concern).
    const hdr       = req.headers?.['x-ratelimit-remaining'];
    const remaining = hdr !== undefined ? parseInt(hdr, 10) : 1;

    if (!Number.isNaN(remaining) && remaining <= 0) {
        return {
            name:   'RATE_LIMIT',
            passed: false,
            reason: 'Rate limit exhausted (x-ratelimit-remaining = 0)',
            data:   { remaining },
        };
    }
    return { name: 'RATE_LIMIT', passed: true, data: { remaining } };
}

function _stageConcurrency(req, txId, userId) {
    const slotKey = slots.deriveKey(req.method, req.path || req.url, userId);
    const result  = slots.reserve(slotKey, txId);

    if (!result.ok) {
        return {
            name:   'CONCURRENCY',
            passed: false,
            reason: `Concurrency denied — ${result.reason}${result.existingTxId ? ` (held by ${result.existingTxId})` : ''}`,
            data:   { slotKey, ...result },
        };
    }
    return { name: 'CONCURRENCY', passed: true, data: { slotKey, reserved: true } };
}

function _stageConstitution(req, roles) {
    const ctx = {
        identity: { roles: roles || [] },
        metadata: { path: req.path || req.url || '/', method: req.method || 'GET' },
    };
    return constPreflight.run(ctx);
}

function _stageMemory() {
    // Lightweight availability check. In production, inject a real ping via opts.memoryCheck.
    return { name: 'MEMORY', passed: true, data: { available: true } };
}

// ── Abort helper (used internally and externally) ─────────────────────────────
function _internalAbort(tx, type, stage, reason, context) {
    const compId = compensationLog.record(tx.txId, type, stage, reason, context || {});
    tx.compensations.push(compId);
    slots.release(tx.txId);
    _transition(tx, TX_STATE.ABORTED);
    tx.durationMs = Date.now() - tx.startedAt;
}

// ── Public API ────────────────────────────────────────────────────────────────

// begin(req, opts) → Transaction (in COMMITTED state)
// Runs preflight stages sequentially; first failure aborts with PetlError.
// opts.memoryCheck — optional async fn; called instead of default memory stub.
function begin(req = {}, opts = {}) {
    const method = (req.method || 'GET').toUpperCase();
    const path   = req.path || req.url || '/';
    const txId   = _nextTxId(method, path);

    const tx = {
        txId,
        state:       TX_STATE.PENDING,
        method,
        path,
        requestId:   req.requestId || req.headers?.['x-request-id'] || null,
        pendingAt:   new Date().toISOString(),

        preflight:          { stages: [], passed: false, durationMs: 0 },
        compiledInvariants: [],
        invariantReport:    null,
        compensations:      [],
        slotKey:            null,
        userId:             null,
        roles:              [],
        latticeDecision:    null,   // populated by beginWithLattice()

        // Timestamps set by _transition()
        preflightAt:  null,
        committedAt:  null,
        executingAt:  null,
        finalizedAt:  null,
        abortedAt:    null,

        startedAt:    Date.now(),
        durationMs:   null,
        result:       null,
    };

    _registry.set(txId, tx);
    _transition(tx, TX_STATE.PREFLIGHT);

    const t0 = Date.now();

    // ── Stage 1: Identity resolution ─────────────────────────────────────────
    const authStage = _stageAuth(req);
    tx.preflight.stages.push(authStage);
    tx.userId = authStage.data.userId;
    tx.roles  = authStage.data.roles;

    // ── Stage 2: Rate limit ──────────────────────────────────────────────────
    const rlStage = _stageRateLimit(req);
    tx.preflight.stages.push(rlStage);
    if (!rlStage.passed) {
        _internalAbort(tx, compensationLog.TYPES.PREFLIGHT_FAILED, 'RATE_LIMIT', rlStage.reason);
        tx.preflight.durationMs = Date.now() - t0;
        const e = new PetlError('RATE_LIMIT_EXCEEDED', txId, rlStage.reason, 429);
        e.tx = tx; throw e;
    }

    // ── Stage 3: Concurrency slot reservation ────────────────────────────────
    const concStage = _stageConcurrency(req, txId, tx.userId);
    tx.preflight.stages.push(concStage);
    if (!concStage.passed) {
        // Slot was not reserved so no slot to release; compensate directly.
        const compId = compensationLog.record(txId, compensationLog.TYPES.CONCURRENCY_DENIED, 'CONCURRENCY', concStage.reason);
        tx.compensations.push(compId);
        _transition(tx, TX_STATE.ABORTED);
        tx.durationMs = Date.now() - tx.startedAt;
        tx.preflight.durationMs = Date.now() - t0;
        const e = new PetlError('CONCURRENCY_DENIED', txId, concStage.reason, 429);
        e.tx = tx; throw e;
    }
    tx.slotKey = concStage.data.slotKey;

    // ── Stage 4: Constitutional gate (fail-closed) ───────────────────────────
    let constStage;
    try {
        constStage = _stageConstitution(req, tx.roles);
    } catch (err) {
        constStage = {
            name: 'CONSTITUTION', passed: false,
            reason: err.message, data: { verdict: 'DENY', risks: ['GATE_THREW'] },
        };
    }
    tx.preflight.stages.push(constStage);
    if (!constStage.passed) {
        _internalAbort(tx, compensationLog.TYPES.CONSTITUTION_BLOCKED, 'CONSTITUTION', constStage.reason, constStage.data);
        tx.preflight.durationMs = Date.now() - t0;
        const e = new PetlError('CONSTITUTION_BLOCKED', txId, constStage.reason, 403);
        e.tx = tx; throw e;
    }

    // ── Stage 5: Memory availability ─────────────────────────────────────────
    const memStage = opts.memoryCheck ? opts.memoryCheck() : _stageMemory();
    // memoryCheck may be sync (returns stage object) or async — but begin() is sync.
    // Callers requiring async memory checks must await an external probe before calling begin().
    const resolvedMem = (memStage && typeof memStage.then === 'function')
        ? { name: 'MEMORY', passed: true, data: { available: true, deferred: true } }
        : memStage;
    tx.preflight.stages.push(resolvedMem);
    if (!resolvedMem.passed) {
        _internalAbort(tx, compensationLog.TYPES.STAGE_FAILED, 'MEMORY', resolvedMem.reason || 'memory unavailable');
        tx.preflight.durationMs = Date.now() - t0;
        const e = new PetlError('MEMORY_UNAVAILABLE', txId, 'Memory layer unavailable', 503);
        e.tx = tx; throw e;
    }

    // ── All stages passed ─────────────────────────────────────────────────────
    tx.preflight.durationMs = Date.now() - t0;
    tx.preflight.passed     = true;

    // Compile invariants from stage results
    tx.compiledInvariants = invariants.compile(tx.preflight.stages, { txId, method, path, userId: tx.userId });

    _transition(tx, TX_STATE.COMMITTED);

    _txSinceLastPrune++;
    if (_txSinceLastPrune >= _PRUNE_EVERY) { prune(); _txSinceLastPrune = 0; }

    return tx;
}

// beginWithLattice(req, opts) → Promise<Transaction>
// Extends begin() with the async decision lattice stage (FM + DT evaluation).
// This is the entry point used by petl-middleware for all production requests.
// Guarantees tx.latticeDecision has all four required fields:
//   constitutionVerdict, founderAlignmentScore, digitalTwinPrediction, finalDecisionScore
async function beginWithLattice(req = {}, opts = {}) {
    const tx = begin(req, opts);   // sync — runs AUTH, RL, CONCURRENCY, CONSTITUTION, MEMORY

    // Constitution data is already computed; pass it to avoid a second gate call.
    const constStage = tx.preflight.stages.find(s => s.name === 'CONSTITUTION');
    const constData  = constStage?.data || {};

    let latticeResult;
    try {
        latticeResult = await lattice.evaluate(req, constData);
    } catch (_) {
        // Lattice infra error — fail-open (constitution already passed)
        latticeResult = {
            finalDecision:         'ALLOW',
            constitutionVerdict:   constData.verdict || 'ALLOW',
            founderAlignmentScore: 0.5,
            digitalTwinPrediction: 0.5,
            finalDecisionScore:    0.6,
            reason:                undefined,
            breakdown:             null,
            driftFlag:             false,
            durationMs:            0,
        };
    }

    const latticeStage = {
        name:   'LATTICE',
        passed: latticeResult.finalDecision !== 'DENY',
        reason: latticeResult.reason,
        data:   latticeResult,
    };

    tx.preflight.stages.push(latticeStage);
    tx.latticeDecision = latticeResult;

    // Extend compiled invariants with the SYSTEM_COHERENCE invariant from the lattice stage.
    const latticeInvariants = invariants.compile([latticeStage], {
        txId:   tx.txId,
        method: tx.method,
        path:   tx.path,
        userId: tx.userId,
    });
    tx.compiledInvariants.push(...latticeInvariants);

    if (!latticeStage.passed) {
        _internalAbort(tx, compensationLog.TYPES.PREFLIGHT_FAILED, 'LATTICE', latticeResult.reason, latticeResult);
        const e = new PetlError('LATTICE_DENY', tx.txId, latticeResult.reason, 403);
        e.tx = tx; throw e;
    }

    return tx;
}

// finalize(txId, result) → Transaction (with invariantReport)
// Call after route handler completes. Runs invariants, releases slot, emits
// compensation markers for any critical invariant violations.
function finalize(txId, result = null) {
    const tx = _registry.get(txId);
    if (!tx)                                                      throw new Error(`Unknown txId: ${txId}`);
    if (tx.state === TX_STATE.FINALIZED || tx.state === TX_STATE.ABORTED) return tx;

    tx.result = result;

    if (tx.state === TX_STATE.COMMITTED) _transition(tx, TX_STATE.EXECUTING);

    // Run all invariant predicates
    tx.invariantReport = invariants.evaluate(tx.compiledInvariants, txId);

    // Emit compensation markers for critical invariant violations
    for (const r of tx.invariantReport.results) {
        if (!r.result && r.critical) {
            const compId = compensationLog.record(
                txId,
                compensationLog.TYPES.INVARIANT_VIOLATION,
                'INVARIANT',
                `${r.name}: ${r.evidence}`,
                { invariant: r.name }
            );
            tx.compensations.push(compId);
        }
    }

    slots.release(txId);
    _transition(tx, TX_STATE.FINALIZED);
    tx.durationMs = Date.now() - tx.startedAt;

    return tx;
}

// abort(txId, reason, stage) → Transaction | null
// Records a compensation marker, releases slot, moves to ABORTED.
// Safe to call on an already-aborted or finalized transaction (no-op).
function abort(txId, reason, stage = 'CALLER_ABORT') {
    const tx = _registry.get(txId);
    if (!tx) return null;
    if (tx.state === TX_STATE.ABORTED || tx.state === TX_STATE.FINALIZED) return tx;

    _internalAbort(tx, compensationLog.TYPES.ABORT_REQUESTED, stage, reason || 'abort requested');
    return tx;
}

// boundMemoryWrite(txId, writeFn, readBackFn?) → Promise<BoundWriteResult>
// Executes a memory write bound to txId with optional read-after-write verification.
// writeFn:    async () → writeResult
// readBackFn: async (writeResult) → readResult  [optional]
// Returns: { ok, result, verified, readBack?, compensationId?, reason? }
async function boundMemoryWrite(txId, writeFn, readBackFn) {
    const tx = _registry.get(txId);
    if (!tx || (tx.state !== TX_STATE.COMMITTED && tx.state !== TX_STATE.EXECUTING)) {
        return { ok: false, verified: false, reason: `Transaction ${txId} not in executable state (${tx?.state})` };
    }

    // Execute the write
    let writeResult;
    try {
        writeResult = await writeFn();
    } catch (err) {
        const compId = compensationLog.record(
            txId, compensationLog.TYPES.MEMORY_VERIFY_FAILED,
            'MEMORY_WRITE', `Write threw: ${err.message}`
        );
        tx.compensations.push(compId);
        return { ok: false, verified: false, reason: err.message, compensationId: compId };
    }

    // No read-back provided — accepted unverified
    if (typeof readBackFn !== 'function') {
        return { ok: true, result: writeResult, verified: false, unverified: true };
    }

    // Verify via read-back
    let readResult;
    try {
        readResult = await readBackFn(writeResult);
    } catch (err) {
        const compId = compensationLog.record(
            txId, compensationLog.TYPES.MEMORY_VERIFY_FAILED,
            'MEMORY_VERIFY', `Read-back threw: ${err.message}`
        );
        tx.compensations.push(compId);
        return { ok: true, result: writeResult, verified: false, compensationId: compId };
    }

    if (readResult === null || readResult === undefined) {
        const compId = compensationLog.record(
            txId, compensationLog.TYPES.MEMORY_VERIFY_FAILED,
            'MEMORY_VERIFY', 'Read-back returned null/undefined — write may not have persisted'
        );
        tx.compensations.push(compId);
        return { ok: true, result: writeResult, verified: false, compensationId: compId };
    }

    return { ok: true, result: writeResult, readBack: readResult, verified: true };
}

// get(txId) → Transaction | null
function get(txId) {
    return _registry.get(txId) || null;
}

// getStats() → aggregate statistics
function getStats() {
    const byCounts = {};
    for (const tx of _registry.values()) {
        byCounts[tx.state] = (byCounts[tx.state] || 0) + 1;
    }
    return { total: _registry.size, byCounts, slotStats: slots.getStats() };
}

// prune(maxAgeMs) → number of transactions pruned
function prune(maxAgeMs = _PRUNE_AGE_MS) {
    const cutoff = Date.now() - maxAgeMs;
    let pruned = 0;
    for (const [txId, tx] of _registry) {
        if ((tx.state === TX_STATE.FINALIZED || tx.state === TX_STATE.ABORTED)
            && tx.startedAt < cutoff) {
            _registry.delete(txId);
            pruned++;
        }
    }
    return pruned;
}

function _reset() {
    _registry.clear();
    _txSeq = 0;
    _txSinceLastPrune = 0;
}

// ── PetlError ─────────────────────────────────────────────────────────────────
class PetlError extends Error {
    constructor(code, txId, reason, httpStatus = 403) {
        super(reason || code);
        this.name       = 'PetlError';
        this.code       = code;
        this.txId       = txId;
        this.httpStatus = httpStatus;
        this.tx         = null;  // set by caller with the aborted transaction
    }
}

module.exports = {
    TX_STATE,
    begin,
    beginWithLattice,
    finalize,
    abort,
    boundMemoryWrite,
    get,
    getStats,
    prune,
    PetlError,
    _reset,
};
