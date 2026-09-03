'use strict';
// lib/finance/sync/sync-health.js
// Health monitoring, stale-data detection, error rate computation, alert management.
// Accepts account/history data as parameters — no internal imports from other sync modules.

const HEALTH_STATUS = {
    HEALTHY:  'HEALTHY',
    DEGRADED: 'DEGRADED',
    STALE:    'STALE',
    ERROR:    'ERROR',
    UNKNOWN:  'UNKNOWN',
};

const ALERT_SEVERITY = {
    INFO:     'INFO',
    WARNING:  'WARNING',
    CRITICAL: 'CRITICAL',
};

const DEFAULT_STALE_THRESHOLD_MS   = 6 * 3_600_000;  // 6 hours
const DEFAULT_ERROR_RATE_THRESHOLD = 0.30;             // 30 %
const DEFAULT_WINDOW_MS            = 3_600_000;        // 1 hour

let _seq    = 0;
const _events = [];   // append-only event log
const _alerts = [];   // append-only alert log
const _thresholds = new Map(); // accountId → { staleMs, errorRate }

function _logEvent(type, payload) {
    _events.push(Object.freeze({ _type: type, _at: new Date().toISOString(), ...payload }));
}

function _nextAlertId() { return `ALERT-${String(++_seq).padStart(6, '0')}`; }

// Record an arbitrary sync event for health tracking.
function recordSyncEvent(opts = {}) {
    const event = Object.freeze({
        accountId:  opts.accountId  || null,
        syncId:     opts.syncId     || null,
        type:       opts.type       || 'SYNC',
        status:     opts.status     || 'UNKNOWN',
        timestamp:  opts.timestamp  || new Date().toISOString(),
        error:      opts.error      || null,
        itemCount:  opts.itemCount  || 0,
        durationMs: opts.durationMs || null,
    });
    _events.push(event);
    return { ...event };
}

// Identify accounts that have not synced within threshold.
function detectStaleAccounts(accounts, thresholdMs) {
    const threshold = thresholdMs || DEFAULT_STALE_THRESHOLD_MS;
    const now       = Date.now();
    const stale     = [];

    for (const account of accounts) {
        const lastSync = account.lastSyncAt ? new Date(account.lastSyncAt).getTime() : null;
        const ageMs    = lastSync !== null ? now - lastSync : Infinity;
        if (ageMs > threshold) {
            stale.push({
                accountId:   account.accountId,
                lastSyncAt:  account.lastSyncAt || null,
                ageMs:       ageMs === Infinity ? null : ageMs,
                neverSynced: lastSync === null,
                thresholdMs: threshold,
            });
        }
    }

    return { staleCount: stale.length, staleAccounts: stale, thresholdMs: threshold };
}

// Compute recent error rate for one account from sync history.
function getErrorRate(accountId, windowMs, syncHistory) {
    const window  = windowMs || DEFAULT_WINDOW_MS;
    const cutoff  = Date.now() - window;
    const history = (syncHistory || []).filter(s =>
        s.accountId === accountId &&
        new Date(s.startedAt || s.completedAt || 0).getTime() > cutoff
    );

    if (history.length === 0) return { ok: false, reason: 'NO_DATA', errorRate: null };

    const failed  = history.filter(s => s.status === 'FAILED').length;
    const partial = history.filter(s => s.status === 'PARTIAL').length;
    const errorRate = (failed + partial * 0.5) / history.length;

    return {
        ok: true,
        accountId,
        windowMs:       window,
        totalSyncs:     history.length,
        failed,
        partial,
        errorRate:      parseFloat(errorRate.toFixed(4)),
        aboveThreshold: errorRate > ((_thresholds.get(accountId)?.errorRate) ?? DEFAULT_ERROR_RATE_THRESHOLD),
    };
}

// Set per-account custom health thresholds.
function setThreshold(accountId, thresholds) {
    _thresholds.set(accountId, { ...(_thresholds.get(accountId) || {}), ...thresholds });
}

// Health check for a single account. Accepts all relevant data as opts.
function checkHealth(accountId, opts = {}) {
    const account      = opts.account      || null;
    const syncHistory  = opts.syncHistory  || [];
    const latestSnap   = opts.latestBalance || null;
    const staleMs      = (_thresholds.get(accountId)?.staleMs) || opts.staleThresholdMs || DEFAULT_STALE_THRESHOLD_MS;

    const issues = [];

    // Account status
    if (account?.status === 'ERROR') {
        issues.push({ code: 'ACCOUNT_IN_ERROR', severity: ALERT_SEVERITY.CRITICAL });
    }
    if (account?.status === 'STALE') {
        issues.push({ code: 'ACCOUNT_STALE', severity: ALERT_SEVERITY.WARNING });
    }

    // Stale sync check
    const lastSync = account?.lastSyncAt ? new Date(account.lastSyncAt).getTime() : null;
    const ageMs    = lastSync !== null ? Date.now() - lastSync : null;

    if (ageMs === null) {
        issues.push({ code: 'NEVER_SYNCED', severity: ALERT_SEVERITY.WARNING });
    } else if (ageMs > staleMs) {
        issues.push({ code: 'SYNC_STALE', ageMs, thresholdMs: staleMs, severity: ALERT_SEVERITY.WARNING });
    }

    // Error rate
    const errResult = getErrorRate(accountId, opts.windowMs, syncHistory);
    if (errResult.ok && errResult.aboveThreshold) {
        issues.push({
            code: 'HIGH_ERROR_RATE',
            errorRate:  errResult.errorRate,
            severity:   ALERT_SEVERITY.CRITICAL,
        });
    }

    // Balance drift
    if (latestSnap?.driftLarge) {
        issues.push({
            code:     'LARGE_BALANCE_DRIFT',
            driftPct: latestSnap.driftPct,
            severity: ALERT_SEVERITY.WARNING,
        });
    }

    // No balance snapshot on record
    if (!latestSnap) {
        issues.push({ code: 'NO_BALANCE_SNAPSHOT', severity: ALERT_SEVERITY.INFO });
    }

    const critical = issues.filter(i => i.severity === ALERT_SEVERITY.CRITICAL);
    const warnings = issues.filter(i => i.severity === ALERT_SEVERITY.WARNING);

    const status = critical.length > 0  ? HEALTH_STATUS.ERROR
        : warnings.length > 0           ? HEALTH_STATUS.DEGRADED
        : ageMs === null                 ? HEALTH_STATUS.UNKNOWN
        : HEALTH_STATUS.HEALTHY;

    return {
        accountId,
        status,
        issues,
        criticalCount: critical.length,
        warningCount:  warnings.length,
        checkedAt:     new Date().toISOString(),
        syncAgeMs:     ageMs,
        errorRate:     errResult.ok ? errResult.errorRate : null,
    };
}

// Aggregate health report across all accounts.
function getHealthReport(accounts, opts = {}) {
    const results  = accounts.map(acct => checkHealth(acct.accountId, { account: acct, ...opts }));
    const byStatus = {};
    for (const s of Object.values(HEALTH_STATUS)) byStatus[s] = 0;
    results.forEach(r => { if (byStatus[r.status] !== undefined) byStatus[r.status]++; });

    return {
        generatedAt:   new Date().toISOString(),
        totalAccounts: accounts.length,
        byStatus,
        critical: results.filter(r => r.status === HEALTH_STATUS.ERROR),
        degraded: results.filter(r => r.status === HEALTH_STATUS.DEGRADED),
        healthy:  results.filter(r => r.status === HEALTH_STATUS.HEALTHY),
        unknown:  results.filter(r => r.status === HEALTH_STATUS.UNKNOWN),
        results,
    };
}

// ─── Alert management ─────────────────────────────────────────────────────────

function raiseAlert(accountId, code, severity, detail = '') {
    const alert = Object.freeze({
        alertId:    _nextAlertId(),
        accountId,
        code,
        severity,
        detail,
        raisedAt:   new Date().toISOString(),
        resolved:   false,
    });
    _alerts.push(alert);
    _logEvent('ALERT_RAISED', { alertId: alert.alertId, accountId, code, severity });
    return { ...alert };
}

function resolveAlert(alertId) {
    const idx = _alerts.findIndex(a => a.alertId === alertId);
    if (idx < 0) return { ok: false, error: 'ALERT_NOT_FOUND' };
    const resolved = Object.freeze({
        ..._alerts[idx],
        resolved:   true,
        resolvedAt: new Date().toISOString(),
    });
    _alerts[idx] = resolved;
    _logEvent('ALERT_RESOLVED', { alertId, accountId: resolved.accountId });
    return { ok: true, alert: { ...resolved } };
}

function getAlerts(accountId) {
    return accountId
        ? _alerts.filter(a => a.accountId === accountId)
        : [..._alerts];
}

function getLog()   { return [..._events]; }

function getStats() {
    return {
        totalEvents:  _events.length,
        totalAlerts:  _alerts.length,
        activeAlerts: _alerts.filter(a => !a.resolved).length,
    };
}

function _reset() {
    _seq = 0; _events.length = 0; _alerts.length = 0; _thresholds.clear();
}

module.exports = {
    HEALTH_STATUS, ALERT_SEVERITY,
    DEFAULT_STALE_THRESHOLD_MS, DEFAULT_ERROR_RATE_THRESHOLD, DEFAULT_WINDOW_MS,
    recordSyncEvent, detectStaleAccounts, getErrorRate, setThreshold,
    checkHealth, getHealthReport,
    raiseAlert, resolveAlert, getAlerts,
    getLog, getStats,
    _reset,
};
