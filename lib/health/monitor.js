'use strict';
// lib/health/monitor.js — in-process operational health state for APEX
// Tracks metrics for providers, retrieval, reflexion, and policy.
// State resets on process restart; health transitions are logged structurally.

const logger = require('../logger');

const THRESHOLDS = {
    provider: {
        consecutiveFailuresForDegraded: 2,
        consecutiveFailuresForCritical: 5,
        highLatencyMs: 8000,
    },
    retrieval: {
        highLatencyMs: 3000,
        consecutiveErrorsForDegraded: 3,
    },
    reflexion: {
        highFailureRatePercent: 20,
    },
};

const _mkProvider = () => ({
    status:              'unknown',  // 'healthy' | 'degraded' | 'unavailable'
    consecutiveFailures:  0,
    totalCalls:           0,
    totalFailures:        0,
    lastSuccessAt:        null,
    lastFailureAt:        null,
    recentLatenciesMs:    [],
});

const _state = {
    providers: { anthropic: _mkProvider(), google: _mkProvider() },
    retrieval: { totalCalls: 0, totalErrors: 0, consecutiveErrors: 0, recentLatenciesMs: [], lastCallAt: null },
    reflexion: { totalWrites: 0, failedWrites: 0, lastFailureAt: null },
    policy:    { fromDB: null, lastCallAt: null },
    certification: { lastResult: null, lastRunAt: null, lastFailures: [] },
    startedAt: Date.now(),
};

function recordProviderCall(provider, success, latencyMs) {
    const p = _state.providers[provider];
    if (!p) return;
    p.totalCalls++;
    if (success) {
        p.consecutiveFailures = 0;
        p.lastSuccessAt       = Date.now();
        const prev = p.status;
        p.status   = 'healthy';
        if (latencyMs != null) { p.recentLatenciesMs.push(latencyMs); if (p.recentLatenciesMs.length > 10) p.recentLatenciesMs.shift(); }
        if (prev !== 'healthy' && prev !== 'unknown') {
            logger.info('health-monitor', 'provider recovered', { provider, prev });
        }
    } else {
        p.consecutiveFailures++;
        p.totalFailures++;
        p.lastFailureAt = Date.now();
        const newStatus = p.consecutiveFailures >= THRESHOLDS.provider.consecutiveFailuresForCritical
            ? 'unavailable'
            : p.consecutiveFailures >= THRESHOLDS.provider.consecutiveFailuresForDegraded
            ? 'degraded' : p.status;
        if (newStatus !== p.status) logger.warn('health-monitor', 'provider status changed', { provider, from: p.status, to: newStatus, consecutiveFailures: p.consecutiveFailures });
        p.status = newStatus;
    }
}

function recordRetrievalCall(latencyMs, success) {
    const r = _state.retrieval;
    r.totalCalls++;
    r.lastCallAt = Date.now();
    if (!success) {
        r.totalErrors++;
        r.consecutiveErrors++;
        if (r.consecutiveErrors >= THRESHOLDS.retrieval.consecutiveErrorsForDegraded) {
            logger.warn('health-monitor', 'retrieval degraded', { consecutiveErrors: r.consecutiveErrors });
        }
    } else {
        r.consecutiveErrors = 0;
        if (latencyMs != null) { r.recentLatenciesMs.push(latencyMs); if (r.recentLatenciesMs.length > 10) r.recentLatenciesMs.shift(); }
    }
}

function recordReflexionWrite(success) {
    const r = _state.reflexion;
    r.totalWrites++;
    if (!success) {
        r.failedWrites++;
        r.lastFailureAt = Date.now();
        const rate = r.failedWrites / r.totalWrites;
        if (r.totalWrites > 5 && rate > THRESHOLDS.reflexion.highFailureRatePercent / 100) {
            logger.warn('health-monitor', 'reflexion write failure rate elevated', { rate: (rate * 100).toFixed(1) + '%', total: r.totalWrites, failed: r.failedWrites });
        }
    }
}

function recordPolicyRetrieval(fromDB) {
    _state.policy.fromDB    = fromDB;
    _state.policy.lastCallAt = Date.now();
}

function recordCertificationResult(pass, failures) {
    _state.certification.lastResult   = pass;
    _state.certification.lastRunAt    = Date.now();
    _state.certification.lastFailures = failures || [];
    logger.info('health-monitor', 'certification result recorded', { pass, failures: (failures || []).length });
}

function _avg(arr) {
    return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
}

function getHealthState() {
    const a = _state.providers.anthropic;
    const g = _state.providers.google;
    const r = _state.retrieval;
    const x = _state.reflexion;

    const overallStatus =
        (a.status === 'unavailable' && g.status === 'unavailable')                      ? 'critical' :
        (a.status === 'unavailable' || a.status === 'degraded')                         ? 'degraded' :
        (r.consecutiveErrors >= THRESHOLDS.retrieval.consecutiveErrorsForDegraded)      ? 'degraded' :
        (x.totalWrites > 5 && x.failedWrites / x.totalWrites > THRESHOLDS.reflexion.highFailureRatePercent / 100) ? 'degraded' :
        'healthy';

    return {
        status:   overallStatus,
        uptimeMs: Date.now() - _state.startedAt,
        components: {
            anthropic:   { status: a.status, consecutiveFailures: a.consecutiveFailures, totalCalls: a.totalCalls, failureRate: a.totalCalls > 0 ? a.totalFailures / a.totalCalls : 0, avgLatencyMs: _avg(a.recentLatenciesMs), lastSuccessAt: a.lastSuccessAt },
            google:      { status: g.status, consecutiveFailures: g.consecutiveFailures, totalCalls: g.totalCalls, failureRate: g.totalCalls > 0 ? g.totalFailures / g.totalCalls : 0, avgLatencyMs: _avg(g.recentLatenciesMs), lastSuccessAt: g.lastSuccessAt },
            retrieval:   { totalCalls: r.totalCalls, consecutiveErrors: r.consecutiveErrors, errorRate: r.totalCalls > 0 ? r.totalErrors / r.totalCalls : 0, avgLatencyMs: _avg(r.recentLatenciesMs) },
            reflexion:   { totalWrites: x.totalWrites, failedWrites: x.failedWrites, failureRate: x.totalWrites > 0 ? x.failedWrites / x.totalWrites : 0, lastFailureAt: x.lastFailureAt },
            policy:      { fromDB: _state.policy.fromDB, lastCallAt: _state.policy.lastCallAt },
            certification: { lastResult: _state.certification.lastResult, lastRunAt: _state.certification.lastRunAt },
        },
        thresholds: THRESHOLDS,
    };
}

module.exports = { recordProviderCall, recordRetrievalCall, recordReflexionWrite, recordPolicyRetrieval, recordCertificationResult, getHealthState, THRESHOLDS };
