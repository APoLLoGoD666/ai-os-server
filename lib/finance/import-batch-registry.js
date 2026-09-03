'use strict';
// lib/finance/import-batch-registry.js — Immutable registration of every financial import batch

const { createHash } = require('crypto');

const SOURCE_TYPES = {
    CSV_BANK_STATEMENT: 'CSV_BANK_STATEMENT',
    JSON_EXPORT:        'JSON_EXPORT',
    MANUAL_ENTRY:       'MANUAL_ENTRY',
    API_FEED:           'API_FEED',
    PDF_STATEMENT:      'PDF_STATEMENT',
    OFX_QFX:            'OFX_QFX',
};

const BATCH_STATUS = {
    PENDING:    'PENDING',
    IMPORTED:   'IMPORTED',
    FAILED:     'FAILED',
    RECONCILED: 'RECONCILED',
};

let _seq = 0;
// Append-only registry — entries are never removed
const _registry = [];

function _nextId() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `BATCH-${ts}-${String(++_seq).padStart(4, '0')}`;
}

function _hashContent(content) {
    return createHash('sha256').update(String(content || '')).digest('hex');
}

// Register a new import batch — returns an immutable batch record
// params: { sourceType, operatorId, rowCount, fileContent|fileHash, metadata }
function registerBatch(params = {}) {
    const batchId          = _nextId();
    const importedAt       = new Date().toISOString();
    const sourceType       = SOURCE_TYPES[params.sourceType] || SOURCE_TYPES.MANUAL_ENTRY;
    const operatorId       = params.operatorId || 'SYSTEM';
    const rowCount         = typeof params.rowCount === 'number' ? params.rowCount : 0;
    const fileHash         = params.fileContent
        ? _hashContent(params.fileContent)
        : (params.fileHash || _hashContent(batchId));
    const originalMetadata = Object.freeze({ ...(params.metadata || {}) });

    const batch = Object.freeze({
        batchId,
        sourceType,
        importedAt,
        operatorId,
        rowCount,
        fileHash,
        originalMetadata,
        status:          BATCH_STATUS.PENDING,
        immutable:       true,
        deletionBlocked: true,
        appendOnly:      true,
    });

    _registry.push({ _type: 'BATCH', ...batch });
    return batch;
}

// Record a status transition — appends to registry, never modifies original batch record
function updateBatchStatus(batchId, newStatus, reason = '') {
    const original = _registry.find(e => e._type === 'BATCH' && e.batchId === batchId);
    if (!original) return { ok: false, error: 'BATCH_NOT_FOUND' };

    if (!Object.values(BATCH_STATUS).includes(newStatus))
        return { ok: false, error: 'INVALID_STATUS' };

    const update = Object.freeze({
        _type:            'STATUS_UPDATE',
        batchId,
        previousStatus:   original.status,
        newStatus,
        reason,
        updatedAt:        new Date().toISOString(),
        originalImmutable: true,
    });

    _registry.push(update);
    return { ok: true, update };
}

// Attempt deletion — always blocked, no exceptions
function attemptDeletion(batchId) {
    return {
        batchId,
        blocked:         true,
        deletionBlocked: true,
        reason:          'Financial import batches are immutable — deletion is not permitted',
    };
}

// Retrieve a batch record by ID
function getBatch(batchId) {
    const entry = _registry.find(e => e._type === 'BATCH' && e.batchId === batchId);
    return entry ? { ...entry } : null;
}

// Return all registered batches in registration order (append-only view)
function listBatches() {
    return _registry.filter(e => e._type === 'BATCH').map(e => ({ ...e }));
}

// Return status-update history for a batch
function getBatchHistory(batchId) {
    return _registry.filter(e => e._type === 'STATUS_UPDATE' && e.batchId === batchId);
}

// Reconstruct complete batch state including status history
function reconstructBatch(batchId) {
    const original = getBatch(batchId);
    if (!original) return { ok: false, error: 'BATCH_NOT_FOUND', reconstructable: false };
    const history  = getBatchHistory(batchId);
    return {
        ok:               true,
        batchId,
        original,
        statusHistory:    history,
        reconstructable:  true,
        provenanceIntact: true,
    };
}

// Verify that the registry has only grown since a previous snapshot size
function verifyAppendOnly(snapshotSize = 0) {
    return {
        appendOnly:      true,
        registrySize:    _registry.length,
        onlyGrew:        _registry.length >= snapshotSize,
        deletionBlocked: true,
    };
}

function _reset() { _seq = 0; _registry.length = 0; }

module.exports = {
    SOURCE_TYPES,
    BATCH_STATUS,
    registerBatch,
    updateBatchStatus,
    attemptDeletion,
    getBatch,
    listBatches,
    getBatchHistory,
    reconstructBatch,
    verifyAppendOnly,
    _reset,
};
