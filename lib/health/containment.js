'use strict';
// lib/health/containment.js — degraded mode management and recovery detection for APEX

const logger  = require('../logger');
const monitor = require('./monitor');
const { detect, classify } = require('./anomaly-detector');

let _containmentActive    = false;
let _containmentReason    = null;
let _containmentStartedAt = null;
let _primaryProviderOverride = null; // 'google' when anthropic is contained

function isContained()      { return _containmentActive; }
function getContainedState() {
    return {
        active:       _containmentActive,
        reason:       _containmentReason,
        startedAt:    _containmentStartedAt,
        providerOverride: _primaryProviderOverride,
    };
}

function activate(reason) {
    if (_containmentActive) return;
    _containmentActive    = true;
    _containmentReason    = reason;
    _containmentStartedAt = Date.now();
    logger.warn('containment', 'DEGRADED MODE ACTIVATED', { reason });
}

function deactivate() {
    if (!_containmentActive) return;
    const duration = Date.now() - _containmentStartedAt;
    logger.info('containment', 'degraded mode cleared', { reason: _containmentReason, durationMs: duration });
    _containmentActive       = false;
    _containmentReason       = null;
    _containmentStartedAt    = null;
    _primaryProviderOverride = null;
}

function setProviderOverride(provider) {
    _primaryProviderOverride = provider;
    if (provider) logger.warn('containment', 'provider failover active', { override: provider });
}

function getProviderOverride() { return _primaryProviderOverride; }

function evaluateAndContain() {
    const health   = monitor.getHealthState();
    const anomalies = detect(health);
    const summary  = classify(anomalies);

    if (summary.status === 'CRITICAL' || summary.status === 'DEGRADED') {
        const topAnomaly = anomalies[0];

        if (!_containmentActive) activate(topAnomaly ? topAnomaly.type : summary.status);

        const anthropicUnavailable = anomalies.some(a => a.type === 'PROVIDER_UNAVAILABLE' && a.provider === 'anthropic');
        const googleOk = health.components.google?.status !== 'unavailable';
        if (anthropicUnavailable && googleOk && !_primaryProviderOverride) {
            setProviderOverride('google');
        }
    } else if (_containmentActive) {
        const providerRestored = !anomalies.some(a => a.type === 'PROVIDER_UNAVAILABLE' || a.type === 'PROVIDER_DEGRADED');
        if (providerRestored) {
            setProviderOverride(null);
            deactivate();
        }
    }

    return { summary, containment: getContainedState() };
}

module.exports = { isContained, getContainedState, activate, deactivate, setProviderOverride, getProviderOverride, evaluateAndContain };
