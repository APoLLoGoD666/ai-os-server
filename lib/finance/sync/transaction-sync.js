'use strict';
// lib/finance/sync/transaction-sync.js
// Incremental transaction sync with duplicate prevention, partial failure isolation,
// and immutable audit trail. Never deletes evidence.

const { createHash } = require('crypto');

const SYNC_STATUS = {
    PENDING:   'PENDING',
    RUNNING:   'RUNNING',
    COMPLETED: 'COMPLETED',
    FAILED:    'FAILED',
    PARTIAL:   'PARTIAL',
};

const DUPLICATE_STATUS = {
    NONE:      'NONE',
    POSSIBLE:  'POSSIBLE',
    LIKELY:    'LIKELY',
    CONFIRMED: 'CONFIRMED',
};

let _txnSeq  = 0;
let _syncSeq = 0;
const _transactions = new Map();   // syncTxnId → record
const _byAccount    = new Map();   // accountId → Set<syncTxnId>
const _syncHistory  = [];
const _log          = [];

function _nextTxnId()  { return `STXN-${String(++_txnSeq).padStart(8, '0')}`; }
function _nextSyncId() {
    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `SYNC-${ts}-${String(++_syncSeq).padStart(4, '0')}`;
}

function _logEvent(type, payload) {
    _log.push(Object.freeze({ _type: type, _at: new Date().toISOString(), ...payload }));
}

function _normaliseAmount(raw) {
    if (typeof raw === 'number') return raw;
    if (raw === null || raw === undefined) return null;
    const v = parseFloat(String(raw).replace(/[,\s$£€¥]/g, '').replace(/\((.+)\)/, '-$1'));
    return isNaN(v) ? null : v;
}

function _descSimilarity(a, b) {
    if (!a || !b) return 0;
    const s1 = String(a).toLowerCase().trim();
    const s2 = String(b).toLowerCase().trim();
    if (s1 === s2) return 1;
    const m = s1.length, n = s2.length;
    if (!m || !n) return 0;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = s1[i-1] === s2[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return 1 - dp[m][n] / Math.max(m, n);
}

// Duplicate check against stored transactions for this account
function _checkDuplicate(accountId, incoming) {
    const ids = _byAccount.get(accountId) || new Set();

    for (const id of ids) {
        const stored = _transactions.get(id);
        if (!stored) continue;

        const incomingExtId = incoming.id || incoming.externalId || incoming.transactionId;
        const storedExtId   = stored.externalId;

        // Strongest signal: matching external ID from the provider
        if (incomingExtId && storedExtId && String(incomingExtId) === String(storedExtId)) {
            return { status: DUPLICATE_STATUS.CONFIRMED, matchedId: id, signal: 'EXTERNAL_ID_MATCH' };
        }

        const incomingAmt = _normaliseAmount(incoming.amount);
        const dateMatch   = stored.transactionDate === (incoming.date || incoming.transactionDate || incoming.posted_date);
        const amountMatch = incomingAmt !== null && stored.amount !== null &&
            Math.abs(Math.abs(incomingAmt) - Math.abs(stored.amount)) < 0.005;
        const descSim     = _descSimilarity(
            incoming.description || incoming.name || incoming.memo,
            stored.description
        );

        if (amountMatch && dateMatch && descSim >= 0.9) {
            return { status: DUPLICATE_STATUS.LIKELY, matchedId: id, signal: 'AMOUNT_DATE_DESC_MATCH' };
        }
        if (amountMatch && dateMatch) {
            return { status: DUPLICATE_STATUS.POSSIBLE, matchedId: id, signal: 'AMOUNT_DATE_MATCH' };
        }
    }

    return { status: DUPLICATE_STATUS.NONE, matchedId: null, signal: null };
}

function _computeConfidence(raw, dupStatus) {
    let c = 1.0;
    if (!raw.date && !raw.transactionDate && !raw.posted_date)    c -= 0.20;
    if (raw.amount === null || raw.amount === undefined)           c -= 0.30;
    if (!raw.description && !raw.name && !raw.memo)               c -= 0.15;
    if (!raw.currency)                                            c -= 0.05;
    if (!raw.id && !raw.externalId && !raw.transactionId)         c -= 0.10;
    if (dupStatus === DUPLICATE_STATUS.POSSIBLE)                  c -= 0.10;
    if (dupStatus === DUPLICATE_STATUS.LIKELY)                    c -= 0.20;
    return Math.max(0, parseFloat(c.toFixed(2)));
}

function _storeTransaction(accountId, raw, provenanceId) {
    const dupCheck = _checkDuplicate(accountId, raw);

    if (dupCheck.status === DUPLICATE_STATUS.CONFIRMED) {
        _logEvent('DUPLICATE_SUPPRESSED', {
            accountId,
            externalId: raw.id || raw.externalId,
            matchedId:  dupCheck.matchedId,
        });
        return {
            stored:    false,
            duplicate: true,
            status:    DUPLICATE_STATUS.CONFIRMED,
            matchedId: dupCheck.matchedId,
        };
    }

    const syncTxnId = _nextTxnId();
    const amount    = _normaliseAmount(raw.amount);

    const record = Object.freeze({
        syncTxnId,
        accountId,
        externalId:       raw.id || raw.externalId || raw.transactionId || null,
        externalRef:      raw.reference || raw.ref || null,
        transactionDate:  raw.date || raw.transactionDate || raw.posted_date || null,
        amount,
        currency:         raw.currency || null,
        description:      raw.description || raw.name || raw.memo || null,
        direction:        amount !== null ? (amount >= 0 ? 'CREDIT' : 'DEBIT') : 'UNKNOWN',
        providerCategory: raw.category || raw.type || null,
        syncedAt:         new Date().toISOString(),
        provenanceId,
        duplicateStatus:  dupCheck.status,
        duplicateNote:    dupCheck.status !== DUPLICATE_STATUS.NONE
            ? `Possible duplicate of ${dupCheck.matchedId} (signal: ${dupCheck.signal})`
            : null,
        confidence:       _computeConfidence(raw, dupCheck.status),
        metadata:         Object.freeze({}),
        originalPayload:  raw,   // full provider payload preserved — no information discarded
        deletionBlocked:  true,
        evidenceRetained: true,
    });

    _transactions.set(syncTxnId, record);
    if (!_byAccount.has(accountId)) _byAccount.set(accountId, new Set());
    _byAccount.get(accountId).add(syncTxnId);

    return { stored: true, syncTxnId, duplicate: dupCheck.status !== DUPLICATE_STATUS.NONE, status: dupCheck.status };
}

// Main sync entry point — pulls from adapter incrementally using cursor watermark.
async function syncTransactions(accountId, adapter, opts = {}) {
    if (!adapter || typeof adapter.getTransactions !== 'function') {
        return { ok: false, error: 'INVALID_ADAPTER' };
    }

    const syncId      = _nextSyncId();
    const startedAt   = new Date().toISOString();
    const provenanceId = opts.provenanceId || `PROV-${syncId}`;
    const cursor       = opts.cursor ?? null;

    _logEvent('SYNC_STARTED', { syncId, accountId, cursor });

    let rawTransactions, nextCursor;
    try {
        const resp = await adapter.getTransactions(accountId, cursor, opts.limit || 500);
        rawTransactions = resp.transactions || resp.data || (Array.isArray(resp) ? resp : []);
        nextCursor = resp.nextCursor ?? resp.cursor ?? cursor;
    } catch (err) {
        const record = {
            syncId, accountId, status: SYNC_STATUS.FAILED,
            startedAt, completedAt: new Date().toISOString(),
            error: err.message, totalReceived: 0, stored: 0, skipped: 0, failures: 1,
            nextCursor: cursor, provenanceId,
        };
        _syncHistory.push(record);
        _logEvent('SYNC_FAILED', { syncId, accountId, error: err.message });
        return { ok: false, error: 'ADAPTER_ERROR', detail: err.message, syncId };
    }

    if (!Array.isArray(rawTransactions)) rawTransactions = rawTransactions ? [rawTransactions] : [];

    const stored   = [];
    const skipped  = [];
    const failures = [];

    for (const raw of rawTransactions) {
        try {
            const result = _storeTransaction(accountId, raw, provenanceId);
            if (result.stored) stored.push(result.syncTxnId);
            else skipped.push({ reason: result.status, externalId: raw.id || raw.externalId });
        } catch (err) {
            // Per-record failure isolated — rest of batch continues
            failures.push({ raw, error: err.message });
            _logEvent('RECORD_FAILURE_ISOLATED', { syncId, accountId, error: err.message });
        }
    }

    const completedAt = new Date().toISOString();
    const status = failures.length > 0 && stored.length > 0 ? SYNC_STATUS.PARTIAL
        : failures.length > 0 && stored.length === 0         ? SYNC_STATUS.FAILED
        : SYNC_STATUS.COMPLETED;

    const syncRecord = {
        syncId, accountId, status,
        startedAt, completedAt,
        totalReceived: rawTransactions.length,
        stored:    stored.length,
        skipped:   skipped.length,
        failures:  failures.length,
        nextCursor,
        provenanceId,
        error: null,
    };
    _syncHistory.push(syncRecord);
    _logEvent('SYNC_COMPLETED', { syncId, accountId, status, stored: stored.length, skipped: skipped.length });

    return {
        ok:         status !== SYNC_STATUS.FAILED,
        syncId, status,
        stored, skipped, failures,
        nextCursor,
        provenanceId,
    };
}

function getTransactionsForAccount(accountId) {
    const ids = _byAccount.get(accountId) || new Set();
    return [...ids]
        .map(id => _transactions.get(id))
        .filter(Boolean)
        .map(t => ({ ...t }));
}

function getSyncHistory(accountId) {
    return accountId
        ? _syncHistory.filter(s => s.accountId === accountId)
        : [..._syncHistory];
}

function getTransaction(syncTxnId) {
    const t = _transactions.get(syncTxnId);
    return t ? { ...t } : null;
}

function attemptDeletion(syncTxnId) {
    _logEvent('DELETION_ATTEMPTED', { syncTxnId, blocked: true });
    return { blocked: true, deletionBlocked: true, reason: 'Sync transaction records are immutable' };
}

function getStats(accountId) {
    const txns = accountId
        ? getTransactionsForAccount(accountId)
        : [..._transactions.values()].map(t => ({ ...t }));
    const byDup = {};
    for (const d of Object.values(DUPLICATE_STATUS)) byDup[d] = 0;
    txns.forEach(t => { if (byDup[t.duplicateStatus] !== undefined) byDup[t.duplicateStatus]++; });
    return {
        total:             txns.length,
        byDuplicateStatus: byDup,
        evidenceRetained:  true,
        deletionBlocked:   true,
    };
}

function getLog() { return [..._log]; }

function _reset() {
    _txnSeq = 0; _syncSeq = 0;
    _transactions.clear(); _byAccount.clear();
    _syncHistory.length = 0; _log.length = 0;
}

module.exports = {
    SYNC_STATUS, DUPLICATE_STATUS,
    syncTransactions,
    getTransactionsForAccount, getSyncHistory, getTransaction,
    attemptDeletion, getStats, getLog,
    _reset,
    _checkDuplicate, _normaliseAmount, _descSimilarity,
};
