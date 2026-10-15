'use strict';
// lib/finance/import/import-batch-manager.js — Tracks import batches; never posts transactions

const { createHash } = require('crypto');

const BATCH_STATUS = {
    CREATED:           'CREATED',
    VALIDATED:         'VALIDATED',
    READY_FOR_REVIEW:  'READY_FOR_REVIEW',
    APPROVED:          'APPROVED',
    REJECTED:          'REJECTED',
};

// Legal transitions — append-only state machine
const TRANSITIONS = {
    CREATED:          ['VALIDATED', 'REJECTED'],
    VALIDATED:        ['READY_FOR_REVIEW', 'REJECTED'],
    READY_FOR_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED:         [],
    REJECTED:         [],
};

let _seq = 0;
const _batches  = new Map();  // batchId → batch record
const _ledger   = [];         // append-only event log

function _nextBatchId() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `IBATCH-${ts}-${String(++_seq).padStart(4, '0')}`;
}

function _hashSource(content) {
    return createHash('sha256').update(String(content || '')).digest('hex').slice(0, 32);
}

function _log(type, payload) {
    _ledger.push(Object.freeze({ _type: type, _at: new Date().toISOString(), ...payload }));
}

// Create a new batch — returns immutable batch record
function createBatch(opts = {}) {
    const batchId      = _nextBatchId();
    const createdAt    = new Date().toISOString();
    const sourceHash   = opts.sourceContent ? _hashSource(opts.sourceContent) : (opts.sourceHash || null);

    const batch = {
        batchId,
        source:           opts.source || 'UNKNOWN',
        sourceType:       opts.sourceType || 'UNKNOWN',
        createdAt,
        recordCount:      typeof opts.recordCount === 'number' ? opts.recordCount : 0,
        validatedCount:   0,
        warningCount:     0,
        duplicateCount:   0,
        status:           BATCH_STATUS.CREATED,
        sourceHash,
        operatorId:       opts.operatorId || 'SYSTEM',
        notes:            [],
        deletionBlocked:  true,
        postingBlocked:   true,   // this system MUST NOT post transactions
    };

    Object.freeze(batch.notes);
    _batches.set(batchId, { ...batch });
    _log('BATCH_CREATED', { batchId, source: batch.source, status: BATCH_STATUS.CREATED });

    return { ...batch };
}

// Attach validation summary to a batch
function recordValidation(batchId, validationSummary = {}) {
    const batch = _batches.get(batchId);
    if (!batch) return { ok: false, error: 'BATCH_NOT_FOUND' };

    const updated = {
        ...batch,
        validatedCount:  typeof validationSummary.passed === 'number' ? validationSummary.passed : batch.validatedCount,
        warningCount:    typeof validationSummary.totalWarnings === 'number' ? validationSummary.totalWarnings : batch.warningCount,
        validationAt:    new Date().toISOString(),
        validationRef:   validationSummary,
    };

    _batches.set(batchId, updated);
    _log('VALIDATION_RECORDED', { batchId, passed: updated.validatedCount, warnings: updated.warningCount });
    return { ok: true, batch: { ...updated } };
}

// Record duplicate detection results
function recordDuplicates(batchId, duplicateSummary = {}) {
    const batch = _batches.get(batchId);
    if (!batch) return { ok: false, error: 'BATCH_NOT_FOUND' };

    const updated = {
        ...batch,
        duplicateCount: typeof duplicateSummary.suspectedCount === 'number'
            ? duplicateSummary.suspectedCount : batch.duplicateCount,
        duplicateRef:   duplicateSummary,
        duplicatesAt:   new Date().toISOString(),
    };

    _batches.set(batchId, updated);
    _log('DUPLICATES_RECORDED', { batchId, duplicateCount: updated.duplicateCount });
    return { ok: true, batch: { ...updated } };
}

// Transition batch status — only legal transitions allowed
function transitionStatus(batchId, newStatus, reason = '') {
    const batch = _batches.get(batchId);
    if (!batch) return { ok: false, error: 'BATCH_NOT_FOUND' };

    const allowed = TRANSITIONS[batch.status] || [];
    if (!allowed.includes(newStatus)) {
        return {
            ok: false,
            error: 'ILLEGAL_TRANSITION',
            from: batch.status,
            to: newStatus,
            allowed,
        };
    }

    const previous = batch.status;
    const updated  = { ...batch, status: newStatus };
    _batches.set(batchId, updated);
    _log('STATUS_TRANSITION', { batchId, from: previous, to: newStatus, reason });

    return { ok: true, batch: { ...updated }, from: previous, to: newStatus };
}

// Attempt deletion — always blocked
function attemptDeletion(batchId) {
    _log('DELETION_ATTEMPTED', { batchId, blocked: true });
    return {
        batchId,
        blocked:         true,
        deletionBlocked: true,
        reason:          'Import batches are immutable — deletion is not permitted at any status',
    };
}

// Attempt posting — always blocked (this system prepares, never posts)
function attemptPosting(batchId) {
    _log('POSTING_ATTEMPTED', { batchId, blocked: true });
    return {
        batchId,
        blocked:        true,
        postingBlocked: true,
        reason:         'Import batch manager does not post transactions — route APPROVED batches to the ledger adapter',
    };
}

function getBatch(batchId) {
    const b = _batches.get(batchId);
    return b ? { ...b } : null;
}

function listBatches(filterStatus) {
    const all = [..._batches.values()].map(b => ({ ...b }));
    return filterStatus ? all.filter(b => b.status === filterStatus) : all;
}

function getLog() {
    return [..._ledger];
}

function getStats() {
    const batches = [..._batches.values()];
    const byStatus = {};
    for (const s of Object.values(BATCH_STATUS)) byStatus[s] = 0;
    batches.forEach(b => { if (byStatus[b.status] !== undefined) byStatus[b.status]++; });

    return {
        totalBatches:    batches.length,
        byStatus,
        totalRecords:    batches.reduce((n, b) => n + b.recordCount, 0),
        totalValidated:  batches.reduce((n, b) => n + b.validatedCount, 0),
        totalDuplicates: batches.reduce((n, b) => n + b.duplicateCount, 0),
        totalWarnings:   batches.reduce((n, b) => n + b.warningCount, 0),
        postingBlocked:  true,
    };
}

function _reset() { _seq = 0; _batches.clear(); _ledger.length = 0; }

module.exports = {
    BATCH_STATUS,
    TRANSITIONS,
    createBatch,
    recordValidation,
    recordDuplicates,
    transitionStatus,
    attemptDeletion,
    attemptPosting,
    getBatch,
    listBatches,
    getLog,
    getStats,
    _reset,
};
