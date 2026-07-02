'use strict';
// lib/finance/sync/balance-sync.js
// Point-in-time balance snapshots with drift detection. Immutable append-only store.

const DRIFT_THRESHOLD_PCT   = 0.01;   // 1 % — below this is noise even if ABS is large
const DRIFT_THRESHOLD_ABS   = 1.00;   // £/$/€ 1 — below this is rounding noise
const SIGNIFICANT_DRIFT_PCT = 0.05;   // 5 % — warrants attention

let _snapSeq = 0;
const _snapshots = new Map();   // snapshotId → record
const _byAccount = new Map();   // accountId   → snapshotId[]
const _log       = [];

function _nextSnapId() { return `BSNAP-${String(++_snapSeq).padStart(8, '0')}`; }

function _logEvent(type, payload) {
    _log.push(Object.freeze({ _type: type, _at: new Date().toISOString(), ...payload }));
}

function _normalise(raw) {
    if (typeof raw === 'number') return raw;
    if (raw === null || raw === undefined) return null;
    const v = parseFloat(String(raw).replace(/[,\s$£€¥]/g, ''));
    return isNaN(v) ? null : v;
}

function _computeDrift(prevCurrent, currCurrent) {
    if (prevCurrent === null || currCurrent === null) {
        return { amount: null, pct: null, significant: false, large: false };
    }
    const amount = currCurrent - prevCurrent;
    const pct    = prevCurrent !== 0
        ? Math.abs(amount / prevCurrent)
        : (currCurrent !== 0 ? 1 : 0);
    const significant = Math.abs(amount) > DRIFT_THRESHOLD_ABS && pct > DRIFT_THRESHOLD_PCT;
    const large       = pct > SIGNIFICANT_DRIFT_PCT;
    return {
        amount:      parseFloat(amount.toFixed(6)),
        pct:         parseFloat(pct.toFixed(6)),
        significant,
        large,
    };
}

// Capture a balance snapshot from an adapter.
// adapter must implement: getBalance(accountId) → { current, available, pending, currency }
async function captureBalanceSnapshot(accountId, adapter, opts = {}) {
    if (!adapter || typeof adapter.getBalance !== 'function') {
        return { ok: false, error: 'INVALID_ADAPTER' };
    }

    let raw;
    try {
        raw = await adapter.getBalance(accountId);
    } catch (err) {
        _logEvent('BALANCE_FETCH_FAILED', { accountId, error: err.message });
        return { ok: false, error: 'ADAPTER_ERROR', detail: err.message };
    }

    const snapshotId = _nextSnapId();
    const capturedAt = new Date().toISOString();

    const current   = _normalise(raw.current ?? raw.currentBalance ?? raw.balance ?? null);
    const available = _normalise(raw.available ?? raw.availableBalance ?? null);
    const pending   = _normalise(raw.pending   ?? raw.pendingBalance  ?? null);
    const currency  = raw.currency || raw.currencyCode || null;

    // Drift from previous snapshot for this account
    const prevIds = _byAccount.get(accountId) || [];
    const prevId  = prevIds.length > 0 ? prevIds[prevIds.length - 1] : null;
    const prev    = prevId ? _snapshots.get(prevId) : null;
    const drift   = _computeDrift(prev?.current ?? null, current);

    const snapshot = Object.freeze({
        snapshotId,
        accountId,
        capturedAt,
        current,
        available,
        pending,
        currency,
        providerReported:    raw,    // raw payload preserved
        provenanceId:        opts.provenanceId || null,
        driftFromPrevious:   drift.amount,
        driftPct:            drift.pct,
        driftSignificant:    drift.significant,
        driftLarge:          drift.large,
        previousSnapshotId:  prevId,
        deletionBlocked:     true,
        immutable:           true,
    });

    _snapshots.set(snapshotId, snapshot);
    if (!_byAccount.has(accountId)) _byAccount.set(accountId, []);
    _byAccount.get(accountId).push(snapshotId);

    _logEvent('BALANCE_CAPTURED', {
        snapshotId, accountId, current,
        driftAmount: drift.amount, driftSignificant: drift.significant,
    });

    if (drift.large) {
        _logEvent('LARGE_DRIFT_DETECTED', {
            snapshotId, accountId,
            driftPct: drift.pct, driftAmount: drift.amount,
        });
    }

    return { ok: true, snapshot: { ...snapshot }, drift };
}

function getLatestBalance(accountId) {
    const ids = _byAccount.get(accountId);
    if (!ids || ids.length === 0) return null;
    const snap = _snapshots.get(ids[ids.length - 1]);
    return snap ? { ...snap } : null;
}

function getBalanceHistory(accountId) {
    const ids = _byAccount.get(accountId) || [];
    return ids.map(id => _snapshots.get(id)).filter(Boolean).map(s => ({ ...s }));
}

// Surface all significant drift events in an account's history.
function detectDrift(accountId, opts = {}) {
    const history = getBalanceHistory(accountId);
    if (history.length < 2) {
        return { ok: false, reason: 'INSUFFICIENT_HISTORY', count: history.length };
    }

    const threshold = opts.driftPctThreshold || SIGNIFICANT_DRIFT_PCT;
    const driftEvents = [];

    for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        const d    = _computeDrift(prev.current, curr.current);
        if (d.significant) {
            driftEvents.push({
                fromSnapshotId: prev.snapshotId,
                toSnapshotId:   curr.snapshotId,
                fromDate:       prev.capturedAt,
                toDate:         curr.capturedAt,
                amount:         d.amount,
                pct:            d.pct,
                large:          d.large,
            });
        }
    }

    return {
        ok:            true,
        accountId,
        snapshotCount: history.length,
        driftEvents,
        hasDrift:      driftEvents.some(d => d.pct > threshold),
        threshold,
    };
}

// Validate an individual snapshot — never mutates it.
function validateSnapshot(snapshot) {
    const issues = [];
    if (snapshot.current === null || snapshot.current === undefined) {
        issues.push({ code: 'MISSING_CURRENT_BALANCE', severity: 'ERROR' });
    }
    if (!snapshot.currency) {
        issues.push({ code: 'MISSING_CURRENCY', severity: 'WARNING' });
    }
    if (snapshot.driftLarge) {
        issues.push({ code: 'LARGE_DRIFT', amount: snapshot.driftFromPrevious, pct: snapshot.driftPct, severity: 'WARNING' });
    }
    if (!snapshot.providerReported) {
        issues.push({ code: 'MISSING_RAW_PAYLOAD', severity: 'ERROR' });
    }
    const errors = issues.filter(i => i.severity === 'ERROR');
    return { ok: errors.length === 0, issues, errors, warnings: issues.filter(i => i.severity === 'WARNING') };
}

function attemptDeletion(snapshotId) {
    _logEvent('DELETION_ATTEMPTED', { snapshotId, blocked: true });
    return { snapshotId, blocked: true, deletionBlocked: true, reason: 'Balance snapshots are immutable' };
}

function getLog() { return [..._log]; }

function getStats(accountId) {
    const snaps = accountId
        ? getBalanceHistory(accountId)
        : [..._snapshots.values()].map(s => ({ ...s }));
    return {
        total:           snaps.length,
        withDrift:       snaps.filter(s => s.driftSignificant).length,
        withLargeDrift:  snaps.filter(s => s.driftLarge).length,
        deletionBlocked: true,
    };
}

function _reset() { _snapSeq = 0; _snapshots.clear(); _byAccount.clear(); _log.length = 0; }

module.exports = {
    captureBalanceSnapshot, getLatestBalance, getBalanceHistory,
    detectDrift, validateSnapshot, attemptDeletion, getLog, getStats,
    DRIFT_THRESHOLD_PCT, DRIFT_THRESHOLD_ABS, SIGNIFICANT_DRIFT_PCT,
    _reset,
};
