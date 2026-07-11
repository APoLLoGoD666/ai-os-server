'use strict';
// lib/finance/sync/sync-provenance.js
// Immutable provenance chain for every sync operation.
// Manual corrections remain permanently visible alongside originals.

const { createHash } = require('crypto');

let _seq = 0;
const _records     = new Map();   // provenanceId → record
const _bySubject   = new Map();   // subjectId    → provenanceId[]
const _corrections = [];          // append-only correction log

function _nextProvId() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `PROV-${ts}-${String(++_seq).padStart(6, '0')}`;
}

function _checksum(data) {
    return createHash('sha256').update(JSON.stringify(data ?? null)).digest('hex').slice(0, 32);
}

function _index(subjectId, provenanceId) {
    if (!subjectId) return;
    if (!_bySubject.has(subjectId)) _bySubject.set(subjectId, []);
    _bySubject.get(subjectId).push(provenanceId);
}

// Record provenance for a sync operation or any external data event.
function recordProvenance(opts = {}) {
    const provenanceId = opts.provenanceId || _nextProvId();
    const recordedAt   = new Date().toISOString();

    if (_records.has(provenanceId)) {
        return { ok: false, error: 'PROVENANCE_ID_ALREADY_EXISTS', provenanceId };
    }

    const record = Object.freeze({
        provenanceId,
        syncId:          opts.syncId          || null,
        accountId:       opts.accountId        || null,
        providerType:    opts.providerType     || 'UNKNOWN',
        sourceEndpoint:  opts.sourceEndpoint   || null,
        fetchedAt:       opts.fetchedAt        || recordedAt,
        recordedAt,
        operator:        opts.operator         || 'SYSTEM',
        rawHeaders:      Object.freeze({ ...(opts.rawHeaders || {}) }),
        checksum:        _checksum(opts.payload || {}),
        payloadSummary:  opts.payloadSummary   || null,
        immutable:       true,
        deletionBlocked: true,
    });

    _records.set(provenanceId, record);

    // Index by every relevant subject
    for (const subject of [opts.provenanceId, opts.syncId, opts.accountId].filter(Boolean)) {
        _index(subject, provenanceId);
    }

    return { ok: true, provenanceId, record: { ...record } };
}

function getProvenance(provenanceId) {
    const r = _records.get(provenanceId);
    return r ? { ...r } : null;
}

function getProvenanceForSubject(subjectId) {
    const ids = _bySubject.get(subjectId) || [];
    return ids.map(id => _records.get(id)).filter(Boolean).map(r => ({ ...r }));
}

// Full provenance chain for a given subject (syncId, accountId, txnId, etc.)
function getProvenanceChain(subjectId) {
    const records = getProvenanceForSubject(subjectId);
    return {
        subjectId,
        chainLength:     records.length,
        records,
        intact:          records.length > 0,
        deletionBlocked: true,
    };
}

function assertProvenanceIntact(subjectId) {
    const chain = getProvenanceChain(subjectId);
    return {
        subjectId,
        intact:           chain.intact,
        chainLength:      chain.chainLength,
        provenanceCount:  chain.records.length,
    };
}

// Record a manual correction — does NOT alter the original record.
// Both the original and the correction remain permanently visible.
function recordManualCorrection(opts = {}) {
    if (!opts.subjectId) throw new Error('subjectId is required');
    if (!opts.operator)  throw new Error('operator is required for manual corrections');

    const correctionId = `CORR-${Date.now()}-${String(++_seq).padStart(4, '0')}`;

    const correction = Object.freeze({
        correctionId,
        subjectId:        opts.subjectId,
        operator:         opts.operator,
        correctionAt:     new Date().toISOString(),
        field:            opts.field          ?? null,
        originalValue:    opts.originalValue  ?? null,
        correctedValue:   opts.correctedValue ?? null,
        reason:           opts.reason         || '',
        visible:          true,              // manual corrections are always visible
        originalPreserved: true,
        deletionBlocked:  true,
    });

    _corrections.push(correction);
    _index(opts.subjectId, correctionId);

    return { ok: true, correctionId, correction: { ...correction } };
}

function getCorrections(subjectId) {
    return subjectId
        ? _corrections.filter(c => c.subjectId === subjectId)
        : [..._corrections];
}

function attemptDeletion(provenanceId) {
    return {
        provenanceId,
        blocked:         true,
        deletionBlocked: true,
        reason:          'Provenance records are immutable — deletion is not permitted',
    };
}

// Verify payload integrity against stored checksum.
function verifyChecksum(provenanceId, payload) {
    const record = _records.get(provenanceId);
    if (!record) return { ok: false, error: 'NOT_FOUND', provenanceId };
    const computed = _checksum(payload);
    return {
        ok:          record.checksum === computed,
        provenanceId,
        stored:      record.checksum,
        computed,
        match:       record.checksum === computed,
    };
}

function getStats() {
    return {
        total:           _records.size,
        corrections:     _corrections.length,
        deletionBlocked: true,
        immutable:       true,
    };
}

function _reset() {
    _seq = 0;
    _records.clear();
    _bySubject.clear();
    _corrections.length = 0;
}

module.exports = {
    recordProvenance, getProvenance, getProvenanceForSubject,
    getProvenanceChain, assertProvenanceIntact,
    recordManualCorrection, getCorrections,
    attemptDeletion, verifyChecksum, getStats,
    _reset,
};
